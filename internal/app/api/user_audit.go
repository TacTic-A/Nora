package api

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	adminapp "github.com/norapanel/nora/internal/app/admin"
	"github.com/norapanel/nora/internal/app/logging"
	telegramapp "github.com/norapanel/nora/internal/app/telegram"
	userapp "github.com/norapanel/nora/internal/app/user"
)

func (s *Server) fetchUserAuditDetail(ctx context.Context, r *http.Request, principal adminPrincipal, username string) *userapp.UserDetail {
	if s.db == nil {
		return nil
	}
	auditCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	adminCtx := s.userAdminContext(principal, nil)
	adminCtx.CanViewTraffic = true
	detail, err := s.userService.UserGet(auditCtx, userapp.UserGetRequest{
		Username:      username,
		RequestOrigin: requestOrigin(r),
		Admin:         adminCtx,
	})
	if err != nil {
		return nil
	}
	s.attachUserDetailLabels(auditCtx, &detail)
	return &detail
}

func (s *Server) recordBestEffortRecentAction(ctx context.Context, actionType, resourceType, resourceKey, summary string, changes []recentActionValueChange, resources []string) {
	if s.db == nil {
		return
	}
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		return s.recordRecentActionEventDetailsTx(ctx, tx, actionType, resourceType, resourceKey, summary, changes, resources)
	})
	if err != nil {
		lower := strings.ToLower(err.Error())
		if strings.Contains(lower, "no such table") || strings.Contains(lower, "doesn't exist") {
			return
		}
		logging.Warnf(logging.ComponentRuntime, "audit event %s (%s) record failed: %v", actionType, resourceKey, err)
	}
}

func formatAuditDataLimit(limit *int64) string {
	if limit == nil || *limit <= 0 {
		return "Unlimited"
	}
	return telegramapp.FormatOptionalBytes(limit)
}

func formatAuditBytesValue(bytes int64) string {
	value := bytes
	return telegramapp.FormatOptionalBytes(&value)
}

func formatAuditExpire(expire *int64) string {
	if expire == nil || *expire <= 0 {
		return "Unlimited"
	}
	return time.Unix(*expire, 0).UTC().Format("2006-01-02 15:04")
}

func formatAuditDuration(seconds *int64) string {
	if seconds == nil || *seconds <= 0 {
		return "—"
	}
	return fmt.Sprintf("%dd (%ds)", *seconds/86400, *seconds)
}

func formatAuditService(detail *userapp.UserDetail) string {
	if detail == nil || detail.ServiceID == nil {
		return "—"
	}
	if detail.ServiceName != nil && strings.TrimSpace(*detail.ServiceName) != "" {
		return fmt.Sprintf("%s (#%d)", strings.TrimSpace(*detail.ServiceName), *detail.ServiceID)
	}
	return fmt.Sprintf("#%d", *detail.ServiceID)
}

func formatAuditInbounds(inbounds map[string][]string) string {
	if len(inbounds) == 0 {
		return "None"
	}
	parts := make([]string, 0, len(inbounds))
	for proto, tags := range inbounds {
		sorted := append([]string(nil), tags...)
		sort.Strings(sorted)
		if len(sorted) > 0 {
			parts = append(parts, fmt.Sprintf("%s:%s", proto, strings.Join(sorted, "+")))
		}
	}
	sort.Strings(parts)
	if len(parts) == 0 {
		return "None"
	}
	return strings.Join(parts, ", ")
}

func formatAuditNextPlans(plans []userapp.NextPlan) string {
	if len(plans) == 0 {
		return "0"
	}
	total := int64(0)
	for _, p := range plans {
		total += p.DataLimit
	}
	return fmt.Sprintf("%d (%s)", len(plans), formatAuditBytesValue(total))
}

func formatAuditGroup(detail *userapp.UserDetail) string {
	if detail == nil || detail.Group == nil {
		return "None"
	}
	return detail.Group.Name
}

func formatAuditTags(tags []string) string {
	if len(tags) == 0 {
		return "None"
	}
	sorted := append([]string(nil), tags...)
	sort.Strings(sorted)
	return strings.Join(sorted, ", ")
}

func formatOptionalInt(v *int64) string {
	if v == nil || *v <= 0 {
		return "—"
	}
	return fmt.Sprintf("%d", *v)
}

func formatOptionalText(v *string) string {
	if v == nil || strings.TrimSpace(*v) == "" {
		return "—"
	}
	return strings.TrimSpace(*v)
}

func buildUserCreateAudit(detail *userapp.UserDetail, fallback userapp.MutationResult) (string, []recentActionValueChange) {
	if detail == nil {
		return "Created user", []recentActionValueChange{
			{Field: "status", Before: "—", After: fallback.Status},
		}
	}
	isUnlimited := detail.DataLimit == nil || *detail.DataLimit <= 0
	summary := fmt.Sprintf("Created user (%s)", formatAuditDataLimit(detail.DataLimit))
	if isUnlimited {
		summary = "Created unlimited traffic user"
	}
	changes := []recentActionValueChange{
		{Field: "status", Before: "—", After: detail.Status},
		{Field: "data_limit", Before: "—", After: formatAuditDataLimit(detail.DataLimit)},
		{Field: "expire", Before: "—", After: formatAuditExpire(detail.Expire)},
		{Field: "service", Before: "—", After: formatAuditService(detail)},
	}
	if detail.DataLimitResetStrategy != "" && detail.DataLimitResetStrategy != "no_reset" {
		changes = append(changes, recentActionValueChange{Field: "data_limit_reset_strategy", Before: "—", After: detail.DataLimitResetStrategy})
	}
	if detail.IPLimit > 0 {
		changes = append(changes, recentActionValueChange{Field: "ip_limit", Before: "0", After: fmt.Sprintf("%d", detail.IPLimit)})
	}
	if detail.SpeedLimitKbps > 0 {
		changes = append(changes, recentActionValueChange{Field: "speed_limit_kbps", Before: "0", After: fmt.Sprintf("%d Kbps", detail.SpeedLimitKbps)})
	}
	if detail.Flow != nil && strings.TrimSpace(*detail.Flow) != "" {
		changes = append(changes, recentActionValueChange{Field: "flow", Before: "—", After: strings.TrimSpace(*detail.Flow)})
	}
	if detail.OnHoldExpireDuration != nil && *detail.OnHoldExpireDuration > 0 {
		changes = append(changes, recentActionValueChange{Field: "on_hold_expire_duration", Before: "—", After: formatAuditDuration(detail.OnHoldExpireDuration)})
	}
	if inb := formatAuditInbounds(detail.Inbounds); inb != "None" {
		changes = append(changes, recentActionValueChange{Field: "inbounds", Before: "—", After: inb})
	}
	if len(detail.NextPlans) > 0 {
		changes = append(changes, recentActionValueChange{Field: "next_plans", Before: "0", After: formatAuditNextPlans(detail.NextPlans)})
	}
	if detail.Group != nil {
		changes = append(changes, recentActionValueChange{Field: "group", Before: "None", After: detail.Group.Name})
	}
	if len(detail.Tags) > 0 {
		changes = append(changes, recentActionValueChange{Field: "tags", Before: "None", After: formatAuditTags(detail.Tags)})
	}
	if detail.Note != nil && strings.TrimSpace(*detail.Note) != "" {
		changes = append(changes, recentActionValueChange{Field: "note", Before: "—", After: strings.TrimSpace(*detail.Note)})
	}
	return summary, changes
}

func buildUserUpdateAudit(before *userapp.UserDetail, after *userapp.UserDetail, fallback userapp.MutationResult) (string, string, []recentActionValueChange) {
	if before == nil || after == nil {
		return "user.update", "Updated user", []recentActionValueChange{
			{Field: "status", Before: "—", After: fallback.Status},
		}
	}
	changes := []recentActionValueChange{}
	add := func(field, b, a string) {
		if b != a {
			changes = append(changes, recentActionValueChange{Field: field, Before: b, After: a})
		}
	}
	add("status", before.Status, after.Status)
	beforeLimit := formatAuditDataLimit(before.DataLimit)
	afterLimit := formatAuditDataLimit(after.DataLimit)
	if beforeLimit != afterLimit {
		changes = append(changes, recentActionValueChange{
			Field:  "data_limit",
			Before: beforeLimit,
			After:  afterLimit,
			Delta:  telegramapp.FormatOptionalBytesDelta(before.DataLimit, after.DataLimit),
		})
	}
	if before.UsedTraffic != after.UsedTraffic {
		changes = append(changes, recentActionValueChange{
			Field:  "used_traffic",
			Before: formatAuditBytesValue(before.UsedTraffic),
			After:  formatAuditBytesValue(after.UsedTraffic),
		})
	}
	add("data_limit_reset_strategy", before.DataLimitResetStrategy, after.DataLimitResetStrategy)
	add("expire", formatAuditExpire(before.Expire), formatAuditExpire(after.Expire))
	add("on_hold_expire_duration", formatAuditDuration(before.OnHoldExpireDuration), formatAuditDuration(after.OnHoldExpireDuration))
	add("on_hold_timeout", formatOptionalText(before.OnHoldTimeout), formatOptionalText(after.OnHoldTimeout))
	add("service", formatAuditService(before), formatAuditService(after))
	add("ip_limit", fmt.Sprintf("%d", before.IPLimit), fmt.Sprintf("%d", after.IPLimit))
	add("speed_limit_kbps", fmt.Sprintf("%d", before.SpeedLimitKbps), fmt.Sprintf("%d", after.SpeedLimitKbps))
	add("flow", formatOptionalText(before.Flow), formatOptionalText(after.Flow))
	add("auto_delete_in_days", formatOptionalInt(before.AutoDeleteInDays), formatOptionalInt(after.AutoDeleteInDays))
	add("inbounds", formatAuditInbounds(before.Inbounds), formatAuditInbounds(after.Inbounds))
	add("next_plans", formatAuditNextPlans(before.NextPlans), formatAuditNextPlans(after.NextPlans))
	if before.CredentialKey != after.CredentialKey && after.CredentialKey != "" {
		changes = append(changes, recentActionValueChange{Field: "subscription_credential", Before: "Rotated", After: "Updated"})
	}
	add("group", formatAuditGroup(before), formatAuditGroup(after))
	add("tags", formatAuditTags(before.Tags), formatAuditTags(after.Tags))
	add("note", formatOptionalText(before.Note), formatOptionalText(after.Note))
	add("telegram_id", formatOptionalText(before.TelegramID), formatOptionalText(after.TelegramID))
	add("contact_number", formatOptionalText(before.ContactNumber), formatOptionalText(after.ContactNumber))

	actionType := "user.update"
	summary := "Updated user"
	if before.Status != "disabled" && after.Status == "disabled" {
		actionType = "user.disable"
		summary = fmt.Sprintf("Disabled user (%s used / %s limit)", formatAuditBytesValue(after.UsedTraffic), afterLimit)
	} else if before.Status == "disabled" && (after.Status == "active" || after.Status == "on_hold") {
		actionType = "user.enable"
		summary = fmt.Sprintf("Enabled user (%s used / %s limit)", formatAuditBytesValue(after.UsedTraffic), afterLimit)
	} else if len(changes) > 0 {
		summary = fmt.Sprintf("Updated user (%d field changes)", len(changes))
	}
	return actionType, summary, changes
}

func buildUserDeleteAudit(before *userapp.UserDetail, fallback userapp.MutationResult) (string, []recentActionValueChange) {
	if before == nil {
		return "Deleted user", []recentActionValueChange{
			{Field: "status", Before: "—", After: "deleted"},
		}
	}
	usedText := formatAuditBytesValue(before.UsedTraffic)
	limitText := formatAuditDataLimit(before.DataLimit)
	summary := fmt.Sprintf("Deleted user (%s used / %s limit)", usedText, limitText)
	changes := []recentActionValueChange{
		{Field: "status", Before: before.Status, After: "deleted"},
		{Field: "used_traffic", Before: usedText, After: "0 B", Delta: "-" + usedText},
		{Field: "data_limit", Before: limitText, After: "—"},
	}
	if before.Expire != nil && *before.Expire > 0 {
		changes = append(changes, recentActionValueChange{Field: "expire", Before: formatAuditExpire(before.Expire), After: "—"})
	}
	if before.ServiceID != nil {
		changes = append(changes, recentActionValueChange{Field: "service", Before: formatAuditService(before), After: "—"})
	}
	if before.AdminUsername != nil && strings.TrimSpace(*before.AdminUsername) != "" {
		changes = append(changes, recentActionValueChange{Field: "owner", Before: strings.TrimSpace(*before.AdminUsername), After: strings.TrimSpace(*before.AdminUsername)})
	}
	_ = fallback
	return summary, changes
}

type bulkAuditSnapshot struct {
	Usernames    []string
	UsedTraffic  int64
	DataLimitSum int64
	LimitedCount int64
}

func (s *Server) snapshotBulkUsersAudit(ctx context.Context, targetAdmin *adminapp.Admin, payload userapp.BulkUsersActionRequest, userIDs []int64) bulkAuditSnapshot {
	if s.db == nil {
		return bulkAuditSnapshot{}
	}
	var query string
	var args []any
	if len(userIDs) > 0 {
		limitIDs := userIDs
		if len(limitIDs) > 500 {
			limitIDs = limitIDs[:500]
		}
		markers := make([]string, len(limitIDs))
		for i, id := range limitIDs {
			markers[i] = "?"
			args = append(args, id)
		}
		query = `SELECT username, COALESCE(used_traffic, 0), COALESCE(data_limit, 0) FROM users WHERE id IN (` + strings.Join(markers, ",") + `) ORDER BY username`
	} else if len(payload.Usernames) > 0 {
		markers := make([]string, len(payload.Usernames))
		for i, name := range payload.Usernames {
			markers[i] = "?"
			args = append(args, strings.ToLower(strings.TrimSpace(name)))
		}
		query = `SELECT username, COALESCE(used_traffic, 0), COALESCE(data_limit, 0) FROM users WHERE LOWER(username) IN (` + strings.Join(markers, ",") + `)`
		if targetAdmin != nil && targetAdmin.ID > 0 {
			query += ` AND admin_id = ?`
			args = append(args, targetAdmin.ID)
		}
		query += ` ORDER BY username`
	} else {
		return bulkAuditSnapshot{}
	}
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return bulkAuditSnapshot{}
	}
	defer rows.Close()
	snap := bulkAuditSnapshot{}
	for rows.Next() {
		var name string
		var used, limit int64
		if err := rows.Scan(&name, &used, &limit); err != nil {
			continue
		}
		if len(snap.Usernames) < 100 {
			snap.Usernames = append(snap.Usernames, name)
		}
		snap.UsedTraffic += used
		if limit > 0 {
			snap.DataLimitSum += limit
			snap.LimitedCount++
		}
	}
	return snap
}

func buildBulkAuditChanges(payload userapp.BulkUsersActionRequest, result userapp.BulkUsersActionResult, snap bulkAuditSnapshot, targetAdmin *adminapp.Admin, serviceRouteID *int64) (string, string, []recentActionValueChange) {
	actionType := "user.bulk_" + string(payload.Action)
	_ = targetAdmin
	_ = serviceRouteID
	summary := fmt.Sprintf("Bulk %s (%d users)", strings.ReplaceAll(string(payload.Action), "_", " "), result.Count)
	changes := []recentActionValueChange{
		{Field: "affected_users", Before: "0", After: fmt.Sprintf("%d", result.Count)},
	}
	if snap.UsedTraffic > 0 {
		changes = append(changes, recentActionValueChange{Field: "used_traffic", Before: formatAuditBytesValue(snap.UsedTraffic), After: formatAuditBytesValue(snap.UsedTraffic)})
	}
	if snap.DataLimitSum > 0 {
		changes = append(changes, recentActionValueChange{Field: "data_limit", Before: formatAuditBytesValue(snap.DataLimitSum), After: formatAuditBytesValue(snap.DataLimitSum)})
	}
	if payload.Gigabytes != nil {
		changes = append(changes, recentActionValueChange{Field: "amount_gb", Before: "—", After: fmt.Sprintf("%.2f GB", *payload.Gigabytes)})
	}
	if payload.Days != nil {
		changes = append(changes, recentActionValueChange{Field: "days", Before: "—", After: fmt.Sprintf("%d d", *payload.Days)})
	}
	if payload.Factor != nil {
		changes = append(changes, recentActionValueChange{Field: "factor", Before: "—", After: fmt.Sprintf("%.2fx", *payload.Factor)})
	}
	return actionType, summary, changes
}
