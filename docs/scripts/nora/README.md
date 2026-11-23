# Nora Installer Scripts

Installer, lifecycle, and migration scripts for Nora and Nora Node.

## Install Nora

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-binary.sh | sudo bash -s -- install
```

Other options:

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-binary.sh | sudo bash -s -- install --dev
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-binary.sh | sudo bash -s -- install --version v0.5.2
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-binary.sh | sudo bash -s -- install --database mysql
```

`--database` accepts `sqlite`, `mysql` or `mariadb`. Without it, the installer asks.

Always pipe the download into `sudo bash -s --` as shown. Running the installer as `sudo bash -c "$(curl ...)"` can exceed Linux's argument limit.

Update to the dev channel or a specific release, and update Xray-core:

```bash
sudo nora update --dev
sudo nora update --version v0.5.2
sudo nora core-update
```

## Install Nora Node

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-node-binary.sh | sudo bash -s -- install
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-node-binary.sh | sudo bash -s -- install --name nora-node2
```

Install only the node CLI:

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/nora-node-binary.sh | sudo bash -s -- install-script
```

## Migration Helpers

Panel migration:

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/migrate_marzban_to_nora.sh | sudo bash -s --
```

Node migration:

```bash
curl -sL https://raw.githubusercontent.com/norapanel/Nora/master/scripts/nora/migrate_marzban_node_to_nora.sh | sudo bash -s --
```

Back up the databases and `.env` files before running a migration script.
