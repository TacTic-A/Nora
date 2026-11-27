package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	adminapp "github.com/norapanel/nora/internal/app/admin"
	"github.com/norapanel/nora/internal/app/labels"
	"github.com/norapanel/nora/internal/app/migrations"
)

func TestAdminsListSortAndFilterRunOnSQLite(t *testing.T) {
	db, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "admin-list.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := migrations.RunMigrations(context.Background(), db, "sqlite"); err != nil {
		t.Fatal(err)
	}

	admins := []struct {
		id                     int64
		username, role, status string
		usage, createdTraffic  int64
		trafficMode            string
		expire, dataLimit      sql.NullInt64
		disabledReason         sql.NullString
	}{
		{1, "alpha", "sudo", "active", 500, 0, "used_traffic", sql.NullInt64{}, sql.NullInt64{}, sql.NullString{}},
		{2, "bravo", "standard", "active", 100, 0, "used_traffic", sql.NullInt64{Int64: 1000, Valid: true}, sql.NullInt64{}, sql.NullString{}},
		{3, "charlie", "reseller", "active", 1000, 0, "used_traffic", sql.NullInt64{}, sql.NullInt64{Int64: 1000, Valid: true}, sql.NullString{}},
		{4, "delta", "full_access", "disabled", 0, 0, "used_traffic", sql.NullInt64{}, sql.NullInt64{}, sql.NullString{}},
		{5, "echo", "standard", "active", 50, 900, "created_traffic", sql.NullInt64{}, sql.NullInt64{Int64: 800, Valid: true}, sql.NullString{}},
	}
	for _, a := range admins {
		if _, err := db.Exec(`INSERT INTO admins (
			id, username, hashed_password, role, permissions, status, subscription_settings,
			users_usage, lifetime_usage, created_traffic, deleted_users_usage,
			traffic_limit_mode, use_service_traffic_limits, show_user_traffic, delete_user_usage_limit_enabled,
			expire, data_limit, disabled_reason
		) VALUES (?, ?, 'unused', ?, '{}', ?, '{}', ?, 0, ?, 0, ?, 0, 1, 0, ?, ?, ?)`,
			a.id, a.username, a.role, a.status, a.usage, a.createdTraffic, a.trafficMode,
			a.expire, a.dataLimit, a.disabledReason); err != nil {
			t.Fatal(err)
		}
	}

	actor := adminapp.Admin{ID: 1, Username: "root", Role: adminapp.RoleFullAccess}
	server := &Server{db: db, dialect: "sqlite", labels: labels.NewStore(db, "sqlite"), adminRepo: adminapp.NewRepository(db, "sqlite")}
	list := func(t *testing.T, query string) (int, []string, int) {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/api/admins?"+query, nil)
		principal := adminPrincipal{
			ID:       actor.ID,
			Username: actor.Username,
			Role:     string(actor.Role),
			Context:  adminapp.EffectiveAdminContext{Admin: actor, Source: adminapp.AuthSourceSession},
		}
		req = req.WithContext(context.WithValue(req.Context(), adminContextKey, principal))
		rec := httptest.NewRecorder()
		server.handleAdminsList(rec, req)
		if rec.Code != http.StatusOK {
			return rec.Code, nil, 0
		}
		var body struct {
			Admins []struct {
				Username string `json:"username"`
			} `json:"admins"`
			Total int `json:"total"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		names := make([]string, 0, len(body.Admins))
		for _, item := range body.Admins {
			names = append(names, item.Username)
		}
		return rec.Code, names, body.Total
	}
	assertNames := func(t *testing.T, query string, want ...string) {
		t.Helper()
		code, got, total := list(t, query)
		if code != http.StatusOK {
			t.Fatalf("%s: status=%d", query, code)
		}
		if total != len(want) || len(got) != len(want) {
			t.Fatalf("%s: got %v (total %d), want %v", query, got, total, want)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("%s: got %v, want %v", query, got, want)
			}
		}
	}

	assertNames(t, "sort=-data_usage", "charlie", "echo", "alpha", "bravo", "delta")
	assertNames(t, "role=standard&sort=-data_usage", "echo", "bravo")
	assertNames(t, "status=expired", "bravo")
	assertNames(t, "status=limited", "charlie", "echo")
	assertNames(t, "status=active", "alpha")
	assertNames(t, "status=disabled", "delta")
	if _, names, _ := list(t, "sort=expire"); len(names) == 0 || names[0] != "bravo" {
		t.Fatalf("sort=expire = %v, want bravo first", names)
	}

	if code, _, _ := list(t, "status=deleted"); code != http.StatusBadRequest {
		t.Fatalf("unknown status status=%d, want 400", code)
	}

	for _, sortKey := range []string{"-online", "-users_count", "-services", "-remaining_traffic", "-status", "-role", "-created_traffic", "-expire"} {
		if code, _, _ := list(t, "sort="+sortKey); code != http.StatusOK {
			t.Fatalf("sort=%s status=%d", sortKey, code)
		}
	}
}

func TestAdminsListDetailedUserMetricsAndRecentActionFiltersSQLite(t *testing.T) {
	db, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "admin-metrics.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := migrations.RunMigrations(context.Background(), db, "sqlite"); err != nil {
		t.Fatal(err)
	}

	if _, err := db.Exec(`INSERT INTO admins (
		id, username, hashed_password, role, permissions, status, subscription_settings,
		users_usage, lifetime_usage, created_traffic, deleted_users_usage,
		traffic_limit_mode, use_service_traffic_limits, show_user_traffic, delete_user_usage_limit_enabled
	) VALUES (1, 'owner', 'unused', 'full_access', '{}', 'active', '{}', 0, 0, 0, 0, 'used_traffic', 0, 1, 0),
	         (2, 'seller', 'unused', 'standard', '{}', 'active', '{}', 300, 900, 500, 50, 'used_traffic', 0, 1, 0)`); err != nil {
		t.Fatal(err)
	}

	if _, err := db.Exec(`INSERT INTO users (id, username, status, used_traffic, data_limit, admin_id, sub_revoked_at) VALUES
		(1, 'u_active_limited', 'active', 100, 1000, 2, NULL),
		(2, 'u_unlimited', 'active', 250, NULL, 2, '2026-11-01 00:00:00'),
		(3, 'u_disabled', 'disabled', 150, 2000, 2, '2026-11-02 00:00:00'),
		(4, 'u_deleted_lim', 'deleted', 400, 3000, 2, NULL),
		(5, 'u_deleted_unlim', 'deleted', 50, NULL, 2, NULL)`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO user_usage_logs (user_id, used_traffic_at_reset, reset_at) VALUES
		(1, 600, '2026-11-01 00:00:00'),
		(1, 150, '2026-11-02 00:00:00'),
		(2, 250, '2026-11-03 00:00:00')`); err != nil {
		t.Fatal(err)
	}

	actor := adminapp.Admin{ID: 1, Username: "owner", Role: adminapp.RoleFullAccess}
	server := &Server{db: db, dialect: "sqlite", labels: labels.NewStore(db, "sqlite"), adminRepo: adminapp.NewRepository(db, "sqlite")}
	principal := adminPrincipal{
		ID:       actor.ID,
		Username: actor.Username,
		Role:     string(actor.Role),
		Context:  adminapp.EffectiveAdminContext{Admin: actor, Source: adminapp.AuthSourceSession},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admins?username=seller", nil)
	req = req.WithContext(context.WithValue(req.Context(), adminContextKey, principal))
	rec := httptest.NewRecorder()
	server.handleAdminsList(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("handleAdminsList status=%d body=%s", rec.Code, rec.Body.String())
	}
	var adminsBody struct {
		Admins []map[string]any `json:"admins"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &adminsBody); err != nil {
		t.Fatal(err)
	}
	if len(adminsBody.Admins) != 1 {
		t.Fatalf("expected 1 seller admin, got %d", len(adminsBody.Admins))
	}
	got := adminsBody.Admins[0]
	assertMetric := func(key string, want int64) {
		t.Helper()
		raw, ok := got[key].(float64)
		if !ok || int64(raw) != want {
			t.Fatalf("metric %s = %v (ok=%v), want %d", key, got[key], ok, want)
		}
	}
	assertMetric("users_count", 3)
	assertMetric("unlimited_users_count", 1)
	assertMetric("limited_data_users_count", 2)
	assertMetric("data_limit_allocated", 3000)
	assertMetric("unlimited_users_usage", 250)
	assertMetric("disabled_users", 1)
	assertMetric("disabled_users_usage", 150)
	assertMetric("disabled_users_data_limit", 2000)
	assertMetric("deleted_users_count", 2)
	assertMetric("deleted_unlimited_users_count", 1)
	assertMetric("deleted_users_used_traffic", 450)
	assertMetric("deleted_users_data_limit", 3000)
	assertMetric("revoked_sub_users_count", 2)
	assertMetric("revoked_sub_users_usage", 400)
	assertMetric("revoked_sub_users_data_limit", 2000)
	assertMetric("reset_usage_users_count", 2)
	assertMetric("reset_usage_count", 3)
	assertMetric("reset_bytes", 1000)

	if _, err := db.Exec(`INSERT INTO recent_actions (id, action_type, resource_type, resource_key, actor_admin_id, actor_username, auth_source, summary, after_hash, rollback_status, created_at) VALUES
		(1, 'inbound.create', 'inbound', 'cdn', 1, 'owner', 'session', 'Created inbound', '', 'available', '2026-11-27 10:00:00'),
		(2, 'user.create', 'user', 'u_unlimited', 2, 'seller', 'session', 'Created unlimited traffic user', '', 'unsupported', '2026-11-27 10:05:00'),
		(3, 'admin.usage_reset', 'admin', 'seller', 1, 'owner', 'session', 'Reset admin usage', '', 'unsupported', '2026-11-27 10:10:00')`); err != nil {
		t.Fatal(err)
	}

	raReq := httptest.NewRequest(http.MethodGet, "/api/core/recent-actions?category=admin_activity&actor=seller&offset=0&limit=30", nil)
	raReq = raReq.WithContext(context.WithValue(raReq.Context(), adminContextKey, principal))
	raRec := httptest.NewRecorder()
	server.handleRecentActionsRoot(raRec, raReq)
	if raRec.Code != http.StatusOK {
		t.Fatalf("handleRecentActionsRoot status=%d body=%s", raRec.Code, raRec.Body.String())
	}
	var raBody struct {
		Actions        []recentActionItem `json:"actions"`
		Total          int                `json:"total"`
		ActorUsernames []string           `json:"actor_usernames"`
	}
	if err := json.Unmarshal(raRec.Body.Bytes(), &raBody); err != nil {
		t.Fatal(err)
	}
	if raBody.Total != 1 || len(raBody.Actions) != 1 || raBody.Actions[0].ResourceKey != "u_unlimited" {
		t.Fatalf("unexpected filtered recent actions: total=%d actions=%#v", raBody.Total, raBody.Actions)
	}
	if len(raBody.ActorUsernames) < 2 {
		t.Fatalf("expected actor_usernames to list admins, got %#v", raBody.ActorUsernames)
	}
}
