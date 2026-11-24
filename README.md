<p align="center">
  <a href="https://github.com/TacTic-A/Nora" target="_blank" rel="noopener noreferrer">
    <img width="160" height="160" src="./dashboard/src/assets/logo.svg" alt="Nora logo">
  </a>
</p>

<h1 align="center">Nora</h1>

<p align="center">
  Unified GUI Censorship Resistant Solution Powered by <a href="https://github.com/XTLS/Xray-core">Xray</a>
</p>

<p align="center">
  <a href="https://github.com/TacTic-A/Nora/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/TacTic-A/Nora/build.yml?branch=master&style=flat-square" alt="Build status"></a>
  <a href="https://github.com/TacTic-A/Nora/actions/workflows/binary-build.yml"><img src="https://img.shields.io/github/actions/workflow/status/TacTic-A/Nora/binary-build.yml?branch=master&style=flat-square" alt="Binary Build status"></a>
  <a href="https://github.com/TacTic-A/Nora/releases/latest"><img src="https://img.shields.io/github/v/release/TacTic-A/Nora?style=flat-square" alt="Latest Release"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/TacTic-A/Nora?style=flat-square" alt="License"></a>
</p>

## Overview

Nora is a comprehensive proxy and VPN management platform built for operating high-capacity, multi-user infrastructure. Powered by Xray-core, it features a compiled Go gateway service and a modern React dashboard. Nora provides full lifecycle control over proxy configurations, user credentials, subscription feeds, and multi-server nodes through a web interface and an automated REST API.

## Features

- **Protocol Support**: Native support for VLESS, VMess, Trojan, Shadowsocks, WireGuard / AmneziaWG, and Hysteria 2.
- **Port Sharing & Fallbacks**: Run multiple protocols, users, and inbounds over standard TLS and REALITY ports using intelligent stream fallbacks.
- **Multi-Node Architecture**: Distribute traffic and proxy inbounds across remote edge servers connected to the central control panel.
- **Subscription Engine**: Automated client subscription links for V2Ray, Clash, Clash Meta / Mihomo, Sing-box, alongside raw links and QR codes.
- **Traffic & Expiry Controls**: Total bandwidth quotas, periodic quotas (daily, weekly, monthly), bandwidth speed limits, and date-based expiration.
- **Modern Management Dashboard**: Fast, responsive web UI with real-time telemetry, compact table views, and dark/light modes.
- **Administrative Access**: Multi-admin system with role-based permissions, sudo delegation, and individual API tokens.
- **Complete REST API**: Fully documented OpenAPI/Swagger endpoints for orchestration and external integrations.

## Prerequisites

- Operating System: Ubuntu 20.04+, Debian 11+, CentOS / RHEL 8+, AlmaLinux, Rocky Linux
- Architecture: `amd64` (x86_64) or `arm64` (aarch64)
- Privileges: Root access (`sudo`)
- Open Ports: 80, 443 (for inbound traffic/certificates), and 8000 (default dashboard port)

## Installation

### Binary Installation (Recommended)

The standalone binary installation provides native execution, direct service management via systemd, and built-in update routines.

Run the installer:

```bash
curl -sL https://raw.githubusercontent.com/TacTic-A/Nora/master/scripts/nora/nora-binary.sh | sudo bash -s -- install
```

To install the latest development build:

```bash
curl -sL https://raw.githubusercontent.com/TacTic-A/Nora/dev/scripts/nora/nora-binary.sh | sudo bash -s -- install --dev
```

### Docker Installation

To deploy using Docker and Docker Compose:

```bash
curl -sL https://raw.githubusercontent.com/TacTic-A/Nora/master/scripts/nora/nora.sh | sudo bash -s -- install
```

## Database Configuration

Nora supports multiple database backends to accommodate both lightweight standalone setups and demanding enterprise deployments.

### Supported Engines

- **MySQL** (Recommended for production): High concurrency, robust indexing, and transaction safety.
- **MariaDB**: Drop-in open-source relational alternative to MySQL.
- **SQLite**: Zero-configuration, single-file database. Suitable for low-resource environments and smaller user bases.

### Selecting a Database During Installation

During the interactive installation process, the installer presents a menu to select your desired database backend:

1. **MySQL**: Automatically configures the service and prompts for optional phpMyAdmin deployment.
2. **SQLite**: Sets up a local SQLite database file at `/var/lib/nora/db.sqlite3`.
3. **MariaDB**: Configures MariaDB service with automated credential generation.

### Non-Interactive Database Flag

For automated scripts or silent provisioning, specify the database engine directly using the `--database` option:

```bash
# Install with MySQL
sudo nora install --database mysql

# Install with SQLite
sudo nora install --database sqlite

# Install with MariaDB
sudo nora install --database mariadb
```

### Manual Configuration via Environment Variables

The database connection is defined in `/opt/nora/.env` (or `$APP_DIR/.env`) using the `SQLALCHEMY_DATABASE_URL` parameter.

#### SQLite Configuration

```env
SQLALCHEMY_DATABASE_URL="sqlite:////var/lib/nora/db.sqlite3"
```

#### MySQL or MariaDB Configuration

```env
SQLALCHEMY_DATABASE_URL="mysql+pymysql://nora:YOUR_PASSWORD@127.0.0.1:3306/nora"
```

After modifying database settings, apply schema migrations and restart the service:

```bash
nora migrate
nora restart
```

## Service Management & CLI

Nora provides an administrative CLI tool (`nora`) installed globally on the system:

```bash
# Service Control
nora up                 # Start services
nora down               # Stop services
nora restart            # Restart services
nora status             # Check service status
nora logs               # Follow real-time logs

# Administration & Maintenance
nora cli                # Launch interactive CLI
nora cli admin create   # Create a new administrator account
nora migrate            # Apply database migrations
nora backup             # Create a full system backup
nora update             # Update panel to the latest stable release
nora update --dev       # Update panel to the development branch
```

## Multi-Node Setup

To distribute traffic and scale infrastructure across multiple geographic regions, install the Nora Node agent on each edge server:

```bash
curl -sL https://raw.githubusercontent.com/TacTic-A/Nora-node/master/scripts/nora/nora-node-binary.sh | sudo bash -s -- install
```

Once installed, connect the node from the **Nodes** section in the Nora dashboard by pasting the generated node connection certificate.

Repository and documentation: [Nora-node](https://github.com/TacTic-A/Nora-node)

## REST API Documentation

Nora provides a comprehensive REST API. Once the panel is installed and running, explore the interactive documentation via Swagger UI:

- **Interactive Documentation**: `http://YOUR_SERVER_IP:8000/api/docs`
- **OpenAPI Specification**: `http://YOUR_SERVER_IP:8000/api/openapi.json`

API keys can be generated directly from the web dashboard under **My Account -> API Keys**.

## License

This project is licensed under the GPL-3.0 License. See the [LICENSE](./LICENSE) file for details.
