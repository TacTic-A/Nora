<p align="center">
  <a href="https://github.com/norapanel/Nora" target="_blank" rel="noopener noreferrer">
    <img width="160" height="160" src="./dashboard/src/assets/logo.svg" alt="Nora logo">
  </a>
</p>

<h1 align="center">Nora</h1>

<p align="center">
  Unified GUI Censorship Resistant Solution Powered by <a href="https://github.com/XTLS/Xray-core">Xray</a>
</p>

<p align="center">
  <a href="https://github.com/norapanel/Nora/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/norapanel/Nora/build.yml?style=flat-square" alt="Build status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/norapanel/Nora?style=flat-square" alt="License"></a>
</p>

## Overview

Nora is a proxy management panel for hundreds of accounts. It lets you create different proxies for your users without complicated configuration, and monitor, modify and limit them from a built-in web dashboard. It is powered by [Xray-core](https://github.com/XTLS/Xray-core), with a Go backend and a React dashboard.

- Built-in **web dashboard** and a full **REST API**
- **Multiple nodes** to spread infrastructure and scale out
- **VMess**, **VLESS**, **Trojan** and **Shadowsocks**, with **multi-protocol** users, **multi-user** and **multi-inbound** on a single port (fallbacks)
- **Traffic** and **expiry** limits, including **periodic** limits (daily, weekly, ...)
- **Subscription links** for V2Ray clients, **Clash** and **Clash Meta**, plus share links and QR codes
- **TLS** and **REALITY**
- Traffic statistics and system monitoring
- Custom Xray configuration
- Command-line interface, **multi-language** dashboard and **multi-admin** support

## Installation

Install the panel with the binary installer:

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-binary.sh | sudo bash -s -- install
```

For the dev channel:

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/dev/scripts/nora/nora-binary.sh | sudo bash -s -- install --dev
```

Install a node on each node server with the [node installer](https://github.com/norapanel/Nora-node).
