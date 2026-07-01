window.commandData = [

  // ── Section 1: Hardware — Detect the Samsung microSD Card ─────
  {
    id: 900, section: "hardware", sectionTitle: "SD Card — Detect & Identify",
    commandTitle: "Insert & Detect the Samsung microSD Card",
    command: "dmesg | tail -20",
    searchTerms: "dmesg sd card detect kernel log insert mmcblk samsung",
    description: "After physically inserting the Samsung microSD card into the Pi 5's card slot (underside, near the PCIe connector), run this to confirm the kernel recognised it. Look for <code>mmc0</code> or a new <code>mmcblk</code> device in the output.",
    parts: [
      { text: "dmesg",    explanation: "prints the kernel ring buffer — all hardware events since boot" },
      { text: "tail -20", explanation: "last 20 lines — enough to catch the insertion event without drowning in boot logs" }
    ],
    example: "[ 2354.123456] mmc0: new high speed SDXC card at address aaaa\n[ 2354.145678] mmcblk1: mmc0:aaaa SC128 119 GiB\n[ 2354.156789]  mmcblk1: p1",
    why: "If you see a new <code>mmcblk</code> device with capacity ~119 GiB, the Pi sees your Samsung 128GB (100GB usable after filesystem overhead) card. If nothing appears, re-seat the card — the Pi 5 slot is firm, push until you feel the spring click."
  },

  {
    id: 901, section: "hardware", sectionTitle: "SD Card — Detect & Identify",
    commandTitle: "List All Block Devices",
    command: "lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL",
    searchTerms: "lsblk block devices list size type mountpoint model identify sd card",
    description: "Lists every storage device the Pi sees: the boot SD card, NVMe/SSD, and the new Samsung SD card. The card typically appears as <code>mmcblk1</code> (or <code>mmcblk0</code> on older setups) with type <code>disk</code> and no mountpoint.",
    parts: [
      { text: "lsblk",  explanation: "list block devices — disks, partitions, and loop devices" },
      { text: "-o NAME,SIZE,TYPE,MOUNTPOINT,MODEL", explanation: "output columns: name, human-readable size, device type, where it's mounted, and the hardware model string" }
    ],
    example: "NAME        SIZE TYPE  MOUNTPOINT   MODEL\nmmcblk0    59.5G disk               SC64G\n├─mmcblk0p1  512M part  /boot\n└─mmcblk0p2   59G part  /\nsda        476.9G disk               Samsung SSD 860\n└─sda1     476.9G part  /mnt/ssd\nmmcblk1   119.1G disk               SD128\n\n# Your Samsung card: mmcblk1, 119.1G, type \"disk\", no mountpoint yet.",
    why: "Before partitioning, verify the card has <strong>no existing partitions</strong> you care about. The <code>MODEL</code> column confirms it's the Samsung card (often shows as <code>SD128</code>, <code>SC128</code>, or <code>SU128</code>). <strong>Do not proceed</strong> if you've mistaken your boot SD card (mmcblk0) for the backup card."
  },

  {
    id: 902, section: "hardware", sectionTitle: "SD Card — Detect & Identify",
    commandTitle: "Check Card Details (Size, Vendor, Speed)",
    command: "sudo fdisk -l /dev/mmcblk1",
    searchTerms: "fdisk list sd card details size model sector speed samsung",
    description: "Shows exact disk geometry and identifies the Samsung card by model string. Confirm you see <code>Samsung</code> or <code>SD128</code> in the output before partitioning.",
    parts: [
      { text: "sudo fdisk -l",     explanation: "list partition tables for a specific device (needs root to read the hardware)" },
      { text: "/dev/mmcblk1",      explanation: "the backup SD card — must match what lsblk showed. If lsblk showed mmcblk2, use that instead" }
    ],
    example: "Disk /dev/mmcblk1: 119.08 GiB, 127865454592 bytes, 249737216 sectors\nDisk model: SD128\nUnits: sectors of 1 * 512 = 512 bytes\nSector size (logical/physical): 512 bytes / 512 bytes\nDisklabel type: dos\nDisk identifier: 0x00000000",
    why: "If <code>Disk model</code> shows <code>SD128</code> (the Samsung model number), the Pi is communicating with the card correctly. If the model field is empty or shows <code>00000</code>, the card may be faulty or not fully seated."
  },

  // ── Section 2: Partition & Format ──────────────────────────────
  {
    id: 910, section: "partition", sectionTitle: "SD Card — Partition & Format",
    commandTitle: "Create a Single ext4 Partition",
    command: "sudo parted /dev/mmcblk1 mklabel gpt && sudo parted /dev/mmcblk1 mkpart primary ext4 0% 100%",
    searchTerms: "parted create partition gpt ext4 single sd card wipe format",
    description: "Wipes any existing partition table and creates a single partition spanning the full 119 GB. Uses <strong>GPT</strong> (modern, handles large drives) instead of the older MBR (DOS) format.",
    parts: [
      { text: "parted",                      explanation: "GNU Parted — creates and modifies partition tables (supports GPT)" },
      { text: "mklabel gpt",                 explanation: "writes a fresh GPT partition table — this <strong>destroys all existing data</strong> on the card" },
      { text: "mkpart primary ext4 0% 100%", explanation: "creates a single partition from the very start (0%) to the very end (100%) of the card" }
    ],
    example: "Information: You may need to update /etc/fstab.\n# Verify the partition was created:\nsudo fdisk -l /dev/mmcblk1\n# Should show: /dev/mmcblk1p1",
    why: "A single partition means you don't have to guess which partition holds the backups. If you later add a larger SD card, this same command works — 0% to 100% adapts to any size automatically."
  },

  {
    id: 911, section: "partition", sectionTitle: "SD Card — Partition & Format",
    commandTitle: "Format Partition as ext4 with Label",
    command: "sudo mkfs.ext4 -L SD-BACKUP /dev/mmcblk1p1",
    searchTerms: "mkfs ext4 format partition label sd-backup filesystem",
    description: "Creates an ext4 filesystem on the new partition with a human-readable label <code>SD-BACKUP</code>. The label makes mount operations and fstab entries self-documenting.",
    parts: [
      { text: "mkfs.ext4",         explanation: "creates an ext4 filesystem — the default, journaling Linux filesystem" },
      { text: "-L SD-BACKUP",      explanation: "sets the volume label to SD-BACKUP — visible in lsblk and usable in fstab" },
      { text: "/dev/mmcblk1p1",    explanation: "the partition we created in the previous step" }
    ],
    example: "mke2fs 1.47.0 (5-Feb-2023)\nCreating filesystem with 31217152 4k blocks and 7806976 inodes\nFilesystem UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890\nSuperblock backups stored on blocks: ...\nAllocating group tables: done\nWriting inode tables: done\nCreating journal (65536 blocks): done\nWriting superblocks and filesystem accounting information: done",
    why: "The label <code>SD-BACKUP</code> survives across reboots and Pi OS reinstalls — even if the device name changes from <code>mmcblk1</code> to <code>mmcblk2</code>, you can always find it by label."
  },

  // ── Section 3: Mount & Make Permanent ──────────────────────────
  {
    id: 920, section: "mount", sectionTitle: "SD Card — Mount & Persist",
    commandTitle: "Create Mount Point & Mount the Card",
    command: "sudo mkdir -p /mnt/sd-backup && sudo mount /dev/mmcblk1p1 /mnt/sd-backup",
    searchTerms: "mkdir mount sd card backup mountpoint ext4",
    description: "Creates a dedicated directory and mounts the formatted card there. After this, the card is usable — you can write files to <code>/mnt/sd-backup/</code>.",
    parts: [
      { text: "mkdir -p /mnt/sd-backup",     explanation: "creates the directory — -p ensures no error if it already exists" },
      { text: "mount /dev/mmcblk1p1 /mnt/sd-backup", explanation: "attaches the ext4 partition to the directory so file operations go to the card" }
    ],
    example: "# Verify it mounted:\ndf -h /mnt/sd-backup\n# Filesystem      Size  Used Avail Use% Mounted on\n# /dev/mmcblk1p1  117G   24K  111G   1% /mnt/sd-backup",
    why: "Mounting to <code>/mnt/sd-backup</code> keeps it out of the way of system paths. <code>/mnt</code> is the Linux convention for manually-mounted temporary filesystems — but we're making it permanent in the next step."
  },

  {
    id: 921, section: "mount", sectionTitle: "SD Card — Mount & Persist",
    commandTitle: "Make Mount Permanent (fstab by LABEL)",
    command: "echo 'LABEL=SD-BACKUP /mnt/sd-backup ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab",
    searchTerms: "fstab permanent mount label ext4 defaults noatime sd backup persist reboot",
    description: "Appends an fstab entry that mounts the card automatically at every boot, referenced by its <code>SD-BACKUP</code> label. Using <code>LABEL=</code> instead of <code>/dev/mmcblk1p1</code> means the mount still works even if the device node changes after a kernel update.",
    parts: [
      { text: "LABEL=SD-BACKUP",              explanation: "identifies the partition by label, not by device path — survives device reordering" },
      { text: "/mnt/sd-backup",               explanation: "where to mount it — must exist (created in the previous step)" },
      { text: "ext4",                          explanation: "filesystem type" },
      { text: "defaults,noatime",             explanation: "default mount options + noatime: doesn't update file access timestamps, slightly faster on flash storage" },
      { text: "0 2",                           explanation: "dump flag (0 = no dump) and fsck order (2 = check after root, which is 1)" }
    ],
    example: "# After writing fstab, test it without rebooting:\nsudo mount -a\n# If no errors, the entry is correct.\ndf -h /mnt/sd-backup\n# Filesystem      Size  Used Avail Use% Mounted on\n# /dev/mmcblk1p1  117G   ...   ...  ...  /mnt/sd-backup\n\n# Confirm the line was appended:\ntail -1 /etc/fstab\n# LABEL=SD-BACKUP /mnt/sd-backup ext4 defaults,noatime 0 2",
    why: "<code>sudo mount -a</code> tests the fstab entry immediately. If it returns an error, fix the entry <strong>before rebooting</strong> — a bad fstab line can drop you into emergency mode on boot."
  },

  // ── Section 4: The Backup Script ───────────────────────────────
  {
    id: 930, section: "backup", sectionTitle: "SD Card — The Backup Script",
    commandTitle: "Create the Full Backup Script",
    command: "cat > /tmp/backup-k3s.sh << 'SCRIPT'",
    searchTerms: "backup script k3s sd card pg dump tar config etcd one command create",
    description: "Creates a self-contained backup script that dumps all PostgreSQL databases, snapshots k3s configs, YAML manifests, and persistent volumes — all to the SD card with a datestamped directory. Paste the content from the <strong>Example output</strong> block into your terminal.",
    parts: [
      { text: "pg_dumpall",               explanation: "dumps every PostgreSQL database in the cluster — one file per database in pg_dumps/" },
      { text: "/etc/rancher/k3s/",        explanation: "the k3s config directory — contains kubeconfig, server token, registries.yaml" },
      { text: "/var/lib/rancher/k3s/",    explanation: "k3s data directory — contains manifests, Helm charts, and the embedded etcd snapshot" },
      { text: "/mnt/k3s-data/",           explanation: "your persistent volume data — Postgres raw files, application uploads, everything PVCs point to" }
    ],
    example: "#!/bin/bash\n# backup-k3s.sh — Full k3s cluster backup to Samsung microSD card\n# Usage: sudo ./backup-k3s.sh\nset -euo pipefail\n\nDEST=\"/mnt/sd-backup/backups/$(date +%Y%m%d-%H%M)\"\nmkdir -p \"$DEST\"\n\necho \"=== [1/5] Dumping PostgreSQL databases ===\"\nmkdir -p \"$DEST/pg_dumps\"\nfor db in $(kubectl exec -it deploy/postgres -- psql -U appuser -t -c \"SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';\" 2>/dev/null | tr -d ' ' | grep -v '^$'); do\n  echo \"  → Dumping $db...\"\n  kubectl exec deploy/postgres -- pg_dump -U appuser \"$db\" > \"$DEST/pg_dumps/${db}-$(date +%Y%m%d).sql\"\ndone\n\necho \"=== [2/5] Backing up k3s configs ===\"\nsudo cp -a /etc/rancher/k3s/k3s.yaml \"$DEST/\"\nsudo cp -a /etc/rancher/k3s/registries.yaml \"$DEST/\" 2>/dev/null || echo \"  (no registries.yaml)\"\n\necho \"=== [3/5] Backing up k3s server token ===\"\nsudo cp -a /var/lib/rancher/k3s/server/token \"$DEST/server-token\"\n\necho \"=== [4/5] Archiving k3s manifests & Helm data ===\"\nsudo tar -czf \"$DEST/k3s-manifests.tar.gz\" \\\n  -C /var/lib/rancher/k3s/server/manifests . 2>/dev/null || echo \"  (no custom manifests)\"\n\necho \"=== [5/5] Archiving persistent volume data ===\"\nsudo tar -czf \"$DEST/persistent-data.tar.gz\" /mnt/k3s-data/\n\necho \"\"\necho \"✅ Backup complete: $DEST\"\necho \"   Size: $(du -sh \"$DEST\" | cut -f1)\"\necho \"\"\necho \"   Files created:\"\nls -lh \"$DEST/\"",
    why: "The datestamped directory (<code>20260701-1430</code>) means every backup is a separate snapshot — no overwriting. A 100GB card can hold 6-12 months of daily backups before you need to rotate. Each backup is ~1-3 GB for a typical homelab."
  },

  {
    id: 931, section: "backup", sectionTitle: "SD Card — The Backup Script",
    commandTitle: "Install & Run the First Backup",
    command: "sudo cp /tmp/backup-k3s.sh /usr/local/bin/backup-k3s && sudo chmod +x /usr/local/bin/backup-k3s && sudo backup-k3s",
    searchTerms: "install backup script run first execute verify chmod",
    description: "Copies the script to a system-wide bin directory, makes it executable, and runs the first backup. After this, <code>sudo backup-k3s</code> will run a full backup from anywhere.",
    parts: [
      { text: "cp /tmp/backup-k3s.sh /usr/local/bin/backup-k3s", explanation: "moves the script to the PATH — /usr/local/bin is for locally-installed admin tools" },
      { text: "chmod +x",                                         explanation: "makes the script executable — without this, bash would need to be invoked explicitly" },
      { text: "sudo backup-k3s",                                  explanation: "runs the backup — needs root to read k3s private configs and /mnt/k3s-data" }
    ],
    example: "=== [1/5] Dumping PostgreSQL databases ===\n  → Dumping appdb...\n=== [2/5] Backing up k3s configs ===\n=== [3/5] Backing up k3s server token ===\n=== [4/5] Archiving k3s manifests & Helm data ===\n=== [5/5] Archiving persistent volume data ===\n\n✅ Backup complete: /mnt/sd-backup/backups/20260701-1430\n   Size: 1.2G\n\n   Files created:\n-rw-r--r-- 1 root root 1.1M Jul  1 14:30 k3s-manifests.tar.gz\n-rw-r--r-- 1 root root 1.2G Jul  1 14:30 persistent-data.tar.gz\n-rw-r--r-- 1 root root  45K Jul  1 14:30 appdb-20260701.sql\n-rw-r--r-- 1 root root 2.9K Jul  1 14:30 k3s.yaml\n-rw-r--r-- 1 root root   64 Jul  1 14:30 server-token",
    why: "Running the first backup immediately proves the script works. If any step fails (e.g., the card isn't mounted, postgres pod isn't running), the script stops at that step thanks to <code>set -e</code>. Fix the issue and re-run."
  },

  {
    id: 932, section: "backup", sectionTitle: "SD Card — The Backup Script",
    commandTitle: "List Backups on the Card",
    command: "ls -lth /mnt/sd-backup/backups/ && echo && echo 'Total backups:' && ls -d /mnt/sd-backup/backups/*/ 2>/dev/null | wc -l",
    searchTerms: "list backups sd card directory count history date",
    description: "Lists all backup snapshots with their dates and sizes. Tracks how many you've accumulated — useful for deciding when to rotate old ones.",
    parts: [
      { text: "ls -lth",  explanation: "lists files with human-readable sizes, sorted by modification time (newest first)" },
      { text: "wc -l",    explanation: "counts the number of backup directories — one line per backup" }
    ],
    example: "total 16K\ndrwxr-xr-x 2 root root 4.0K Jul  1 14:30 20260701-1430\ndrwxr-xr-x 2 root root 4.0K Jun 30 14:30 20260630-1430\ndrwxr-xr-x 2 root root 4.0K Jun 29 14:30 20260629-1430\n\nTotal backups:\n3",
    why: "Each backup directory is a complete self-contained snapshot. To restore from any point in time, pick the directory with the right date — the restore script (next section) works with any of them."
  },

  // ── Section 5: One-Command Restore (the Vagrant pattern) ───────
  {
    id: 940, section: "restore", sectionTitle: "SD Card — One-Command Restore",
    commandTitle: "Create the Restore Script",
    command: "cat > /tmp/restore-k3s.sh << 'SCRIPT'",
    searchTerms: "restore script one command k3s sd card backup disaster recovery vagrant up equivalent",
    description: "Creates the restore script — the Pi equivalent of <code>vagrant up</code>. Given a backup directory on the SD card, this single command restores k3s configs, the server token, manifests, persistent data, and PostgreSQL databases. Paste the content from the <strong>Example output</strong> block.",
    parts: [
      { text: "restore configs & token",  explanation: "places the backed-up k3s.yaml and server token back where k3s expects them" },
      { text: "restore persistent data",  explanation: "untars the PVC data back to /mnt/k3s-data — Postgres finds its data on the next pod restart" },
      { text: "restore databases",        explanation: "replays pg_dump SQL files into Postgres — recreates tables, indexes, and data" },
      { text: "restart k3s + verify",     explanation: "reloads the k3s service so it picks up restored configs, then checks that pods come back healthy" }
    ],
    example: "#!/bin/bash\n# restore-k3s.sh — One-command k3s restore from Samsung microSD card\n# Usage: sudo ./restore-k3s.sh /mnt/sd-backup/backups/20260701-1430\nset -euo pipefail\n\nBACKUP_DIR=\"${1:?Usage: restore-k3s.sh <backup-directory>}\"\nif [ ! -d \"$BACKUP_DIR\" ]; then\n  echo \"❌ Backup directory not found: $BACKUP_DIR\"\n  echo \"   Available backups:\"\n  ls -d /mnt/sd-backup/backups/*/ 2>/dev/null || echo \"   (none)\"\n  exit 1\nfi\n\necho \"=== Restoring k3s from: $BACKUP_DIR ===\"\necho \"\"\n\necho \"=== [1/6] Stopping k3s ===\"\nsudo systemctl stop k3s\n\necho \"=== [2/6] Restoring k3s configs ===\"\nif [ -f \"$BACKUP_DIR/k3s.yaml\" ]; then\n  sudo cp \"$BACKUP_DIR/k3s.yaml\" /etc/rancher/k3s/k3s.yaml\n  echo \"  ✓ k3s.yaml restored\"\nfi\nif [ -f \"$BACKUP_DIR/server-token\" ]; then\n  sudo cp \"$BACKUP_DIR/server-token\" /var/lib/rancher/k3s/server/token\n  echo \"  ✓ server token restored\"\nfi\n\necho \"=== [3/6] Restoring k3s manifests ===\"\nif [ -f \"$BACKUP_DIR/k3s-manifests.tar.gz\" ]; then\n  sudo mkdir -p /var/lib/rancher/k3s/server/manifests\n  sudo tar -xzf \"$BACKUP_DIR/k3s-manifests.tar.gz\" -C /var/lib/rancher/k3s/server/manifests/\n  echo \"  ✓ manifests restored\"\nfi\n\necho \"=== [4/6] Restoring persistent data ===\"\nif [ -f \"$BACKUP_DIR/persistent-data.tar.gz\" ]; then\n  sudo tar -xzf \"$BACKUP_DIR/persistent-data.tar.gz\" -C /\n  echo \"  ✓ persistent data restored\"\nfi\n\necho \"=== [5/6] Starting k3s ===\"\nsudo systemctl start k3s\necho \"  Waiting for k3s to be ready...\"\nsleep 15\nkubectl get nodes\n\necho \"=== [6/6] Restoring PostgreSQL databases ===\"\necho \"  Waiting for postgres pod to be ready...\"\nkubectl wait --for=condition=Ready pod -l app=postgres --timeout=120s 2>/dev/null || echo \"  (postgres pod not found — if this is a fresh cluster, apply postgres-deployment.yaml first)\"\n\nfor sqlfile in \"$BACKUP_DIR\"/pg_dumps/*.sql; do\n  if [ -f \"$sqlfile\" ]; then\n    dbname=$(basename \"$sqlfile\" | sed 's/-[0-9]\\{8\\}\\.sql$//')\n    echo \"  → Restoring $dbname from $(basename \"$sqlfile\")...\"\n    kubectl exec -i deploy/postgres -- psql -U appuser -d \"$dbname\" < \"$sqlfile\"\n    echo \"    ✓ $dbname restored\"\n  fi\ndone\n\necho \"\"\necho \"✅ Restore complete!\"\necho \"\"\necho \"   Now verify:\"\necho \"   kubectl get pods -A\"\necho \"   kubectl get nodes\"\necho \"   curl http://localhost/health\"",
    why: "This is the <code>vagrant up</code> equivalent for your k3s cluster. Insert the SD card, mount it, run <code>sudo restore-k3s /mnt/sd-backup/backups/20260701-1430</code>, and your entire cluster comes back — configs, Postgres data, persistent volumes, everything. The script checks each file's existence so missing optional pieces (e.g., no custom manifests) don't block the restore."
  },

  {
    id: 941, section: "restore", sectionTitle: "SD Card — One-Command Restore",
    commandTitle: "Install the Restore Script",
    command: "sudo cp /tmp/restore-k3s.sh /usr/local/bin/restore-k3s && sudo chmod +x /usr/local/bin/restore-k3s",
    searchTerms: "install restore script chmod cp bin path system-wide",
    description: "Makes <code>restore-k3s</code> available globally. After this, any administrator can run <code>sudo restore-k3s /mnt/sd-backup/backups/20260701-1430</code> to perform a full cluster restore.",
    parts: [
      { text: "cp ... /usr/local/bin/", explanation: "places the script where all users can run it (in the default PATH)" },
      { text: "chmod +x",               explanation: "makes it directly executable — no need to type 'bash restore-k3s'" }
    ],
    example: "# Now usable from anywhere:\nsudo restore-k3s /mnt/sd-backup/backups/20260701-1430\n\n# With tab-completion on the directory name:\nsudo restore-k3s /mnt/sd-backup/backups/202607<TAB>\n# → /mnt/sd-backup/backups/20260701-1430",
    why: "The restore script is your disaster recovery tool. Print it and keep a physical copy with the SD card. If the Pi's boot SD dies, you flash a new Pi OS, install k3s, insert the backup card, and run one command."
  },

  {
    id: 942, section: "restore", sectionTitle: "SD Card — One-Command Restore",
    commandTitle: "Verify Restored Cluster Health",
    command: "kubectl get nodes && echo '---' && kubectl get pods -A && echo '---' && kubectl get pvc",
    searchTerms: "verify restore cluster health nodes pods pvc postgres healthy ready",
    description: "Runs the three most important health checks after a restore: node status (must show <code>Ready</code>), pod status across all namespaces, and PersistentVolumeClaim binding (must show <code>Bound</code>).",
    parts: [
      { text: "kubectl get nodes",   explanation: "confirms the cluster node is Ready — the foundation of everything else" },
      { text: "kubectl get pods -A", explanation: "checks every pod in every namespace — all should be Running or Completed" },
      { text: "kubectl get pvc",     explanation: "verifies the PVC for Postgres is Bound — means the restored /mnt/k3s-data is intact and readable" }
    ],
    example: "NAME       STATUS   ROLES                  AGE     VERSION\npi5-k3s    Ready    control-plane,master   5m      v1.29.5+k3s1\n---\nNAMESPACE     NAME                              READY   STATUS\ndefault       postgres-7f8d9c6b5-abc12          1/1     Running\ndefault       node-api-5g6h7j8k9-def34          1/1     Running\nkube-system   coredns-57f9d8c6b5-ghi56          1/1     Running\nkube-system   traefik-7d6f8g9h0-jkl78           1/1     Running\nkube-system   local-path-provisioner-abc12       1/1     Running\n---\nNAME           STATUS   VOLUME        CAPACITY\ndatabase-pvc   Bound    database-pv   5Gi",
    why: "If all three show healthy (Ready + Running + Bound), the restore succeeded. If any pod is CrashLoopBackOff, check <code>kubectl logs</code> — the most common issue is Postgres version mismatch between the dumped SQL and the running container image."
  },

  // ── Section 6: Automation — Daily Backups ───────────────────────
  {
    id: 950, section: "automation", sectionTitle: "SD Card — Daily Automation",
    commandTitle: "Add a Daily Cron Job",
    command: "echo '0 2 * * * root /usr/local/bin/backup-k3s >> /var/log/k3s-backup.log 2>&1' | sudo tee /etc/cron.d/k3s-backup",
    searchTerms: "cron daily backup automate 2am schedule crontab k3s",
    description: "Creates a cron job that runs the backup every night at 2:00 AM — when the cluster is idle and Postgres sees minimal write activity. Output is logged to a dedicated file for later inspection.",
    parts: [
      { text: "0 2 * * *",              explanation: "cron schedule: minute=0, hour=2, every day, every month, every weekday. 2 AM local server time." },
      { text: "root",                    explanation: "runs as root — needed to read k3s configs and write to /mnt/sd-backup" },
      { text: "/etc/cron.d/k3s-backup",  explanation: "the drop-in directory for system cron jobs — cleaner than editing root's crontab" },
      { text: ">> /var/log/k3s-backup.log 2>&1", explanation: "appends both stdout and stderr to a log file so you can debug failed backups" }
    ],
    example: "# Verify cron picked it up:\nsudo run-parts --test /etc/cron.d\n# Output should include: /etc/cron.d/k3s-backup\n\n# Check the log after the first automated run:\nsudo cat /var/log/k3s-backup.log\n# === [1/5] Dumping PostgreSQL databases ===\n#   → Dumping appdb...\n# ...\n# ✅ Backup complete: /mnt/sd-backup/backups/20260702-0200",
    why: "2 AM is chosen because the Pi 5 runs 24/7 and cluster load is near zero at that hour. Cron requires a trailing newline — make sure the echo command includes one (the shell adds it automatically)."
  },

  {
    id: 951, section: "automation", sectionTitle: "SD Card — Daily Automation",
    commandTitle: "Add Auto-Cleanup of Old Backups",
    command: "echo '0 3 * * 0 root find /mnt/sd-backup/backups/ -maxdepth 1 -type d -mtime +90 -exec rm -rf {} \\;' | sudo tee /etc/cron.d/k3s-backup-cleanup",
    searchTerms: "cleanup old backups retention rotation 90 days auto delete cron",
    description: "Adds a weekly cleanup job (Sunday at 3 AM) that deletes backup directories older than 90 days. This prevents the card from filling up — 90 days of daily backups is ~90-270 GB, well within the 100 GB card.",
    parts: [
      { text: "0 3 * * 0",     explanation: "weekly: 3 AM every Sunday" },
      { text: "-mtime +90",    explanation: "files/directories modified more than 90 days ago — adjustable; change to +30 for a 30-day rotation" },
      { text: "-exec rm -rf",  explanation: "deletes matching directories — safe because we constrained to exactly the backups/ directory with -maxdepth 1" }
    ],
    example: "# Manually see what would be deleted (dry run):\nfind /mnt/sd-backup/backups/ -maxdepth 1 -type d -mtime +90\n# /mnt/sd-backup/backups/20260401-0200\n# /mnt/sd-backup/backups/20260402-0200\n\n# Tune retention: edit /etc/cron.d/k3s-backup-cleanup\n# Change +90 to +180 for 6 months, or +7 for one week.",
    why: "90 days is conservative for a home lab. Adjust to 30 days if you're tight on space, or 180 days if you want a longer history. The <code>-maxdepth 1</code> guard ensures <code>rm -rf</code> can't wander outside the backups directory."
  },

  // ── Section 7: Card Health & Verification ──────────────────────
  {
    id: 960, section: "verify", sectionTitle: "SD Card — Health & Verification",
    commandTitle: "Check Card Filesystem Health",
    command: "sudo fsck -n /dev/mmcblk1p1",
    searchTerms: "fsck check filesystem health sd card verify corruption errors",
    description: "Runs a read-only (<code>-n</code>) filesystem check on the backup card to detect corruption or bit rot before you need to rely on it for a restore. Does not modify anything.",
    parts: [
      { text: "fsck",  explanation: "filesystem consistency check — the ext4 equivalent of chkdsk" },
      { text: "-n",    explanation: "no-write mode — reports problems without attempting repairs (safe on a mounted filesystem if you're just checking)" }
    ],
    example: "e2fsck 1.47.0\nSD-BACKUP: clean, 245/31217152 files, 1890234/31217152 blocks\n\n# If it shows errors like:\n# SD-BACKUP: ********** WARNING: Filesystem still has errors **********\n# → Unmount the card (sudo umount /mnt/sd-backup) and run:\n# sudo fsck -y /dev/mmcblk1p1   (the -y auto-answers yes to repairs)",
    why: "Run this once a month. SD cards silently corrupt more often than SSDs — a backup card with undetected corruption is worse than no backup at all (it gives false confidence)."
  },

  {
    id: 961, section: "verify", sectionTitle: "SD Card — Health & Verification",
    commandTitle: "Check Card Wear & Lifespan",
    command: "sudo apt install -y mmc-utils && sudo mmc extcsd read /dev/mmcblk1 | grep -E 'LIFE|PRE_EOL|WEAR'",
    searchTerms: "mmc extcsd wear level lifespan sd card health pre_eol life time",
    description: "Reads the MMC extended CSD register from the Samsung card to report wear-out information. The <code>PRE_EOL_INFO</code> field tells you if the card is healthy (0x01 = normal), near end-of-life (0x02 = warning), or failing (0x03 = urgent).",
    parts: [
      { text: "mmc-utils",  explanation: "package containing mmc — the tool for reading MMC/SD card internal registers" },
      { text: "mmc extcsd read", explanation: "reads the extended Card-Specific Data register — low-level hardware info from the card's controller" },
      { text: "PRE_EOL_INFO",   explanation: "Pre-End-of-Life Information — the key field. 0x01 = healthy, 0x02 = 80% of rated writes used, 0x03 = exceeding rating" }
    ],
    example: "PRE_EOL_INFO: 0x01\n# 0x01 → card is healthy. No action needed.\n\n# If 0x02 (warning):\n# → The card has used ~80% of its rated write cycles.\n# → Plan to replace it. Keep a second card and rotate between them.\n\n# If 0x03 (urgent):\n# → Replace immediately — data loss is likely within weeks.",
    why: "The Samsung EVO/Pro cards are rated for thousands of write cycles, but daily backups write ~1-3 GB per day. At that rate, even a modest card should last 5+ years. This check confirms the reality matches the rating."
  },

  {
    id: 962, section: "verify", sectionTitle: "SD Card — Health & Verification",
    commandTitle: "Dry-Run Restore (Verify Backup Integrity)",
    command: "sudo tar -tzf /mnt/sd-backup/backups/$(ls -t /mnt/sd-backup/backups/ | head -1)/persistent-data.tar.gz | head -20",
    searchTerms: "tar test backup integrity dry run verify content list without extracting",
    description: "Lists the contents of the most recent persistent-data archive without extracting it. This proves the archive isn't corrupted and contains the expected directories before you ever need it.",
    parts: [
      { text: "tar -tzf",  explanation: "test/list (-t) a gzip archive (-z) from file (-f) — reads the full archive to verify it's intact" },
      { text: "$(ls -t ... | head -1)", explanation: "shell substitution that picks the newest backup directory — no need to type the date" },
      { text: "head -20",  explanation: "shows just the first 20 entries — enough to confirm the structure without flooding the terminal" }
    ],
    example: "mnt/k3s-data/\nmnt/k3s-data/databases/\nmnt/k3s-data/databases/postgres/\nmnt/k3s-data/databases/postgres/base/\nmnt/k3s-data/databases/postgres/pg_wal/\nmnt/k3s-data/applications/\n\n# If tar reports errors like:\n# gzip: stdin: unexpected end of file\n# tar: Child returned status 1\n# → The archive is corrupted. Delete this backup and investigate:\n# ls -lh /mnt/sd-backup/backups/*/persistent-data.tar.gz\n# Look for files with zero size or unusually small size.",
    why: "A corrupted tarball will still show up in <code>ls</code> — it looks like a backup but isn't. The <code>tar -t</code> test actually decompresses and reads the entire stream, catching bit rot and incomplete writes. Run this monthly."
  },

  // ── Section 8: Complete Workflow Checklist ──────────────────────
  {
    id: 970, section: "workflow", sectionTitle: "SD Card — Complete Workflow",
    commandTitle: "Full Setup: Card → Backup → Restore (End-to-End)",
    command: "cat /usr/local/bin/backup-k3s > /dev/null && cat /usr/local/bin/restore-k3s > /dev/null && echo 'Both scripts installed ✓' && ls -d /mnt/sd-backup/backups/*/ 2>/dev/null | wc -l | xargs echo 'Backups stored:'",
    searchTerms: "end to end full workflow verify completed setup backup restore scripts",
    description: "Quick end-to-end check: verifies both scripts are installed and counts how many backups exist on the card. When you see both checkmarks, the SD card backup system is fully operational.",
    parts: [
      { text: "cat ... > /dev/null", explanation: "checks the file exists and is readable — discards output, only cares about exit code" },
      { text: "ls -d ... | wc -l",  explanation: "counts backup directories silently — if the card isn't mounted, this returns 0 without error" }
    ],
    example: "Both scripts installed ✓\nBackups stored: 3\n\n# If you see \"Backups stored: 0\", the card might not be mounted:\ndf -h /mnt/sd-backup\n# Mount it if needed: sudo mount -a",
    why: "This is the one-liner you run after a Pi OS reinstall to confirm the backup system survived. Install k3s, insert the card, mount it, run this — and your full restore capability is ready."
  }

];
