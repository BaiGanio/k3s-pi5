// modules/k3s-pi5/sd-card-backup.js
// SD Card Backup and One-Command Restore — your insurance policy for the k3s cluster

window.pageBlocks = [

  // ── What is SD Card Backup? ───────────────────────────────────────────────

  {
    type: 'prose',
    title: 'SD Card Backup: Your Insurance Policy',
    content: `
      <p>
        <strong>A backup you have not tested is not a backup — it is a wish.</strong> The Pi 5
        has no built-in snapshot infrastructure. There is no Time Machine, no cloud sync, no
        replication. If your boot drive fails, your Postgres data is gone. If a k3s
        upgrade goes wrong, your cluster state is unrecoverable. The Samsung microSD card in
        the Pi's underside slot is your lifeline.
      </p>

      <h4>What This Module Covers</h4>
      <p>
        A complete, tested backup-and-restore system on a single 128 GB Samsung microSD card:
      </p>
      <ul>
        <li><strong>Detect and format</strong> the card — identify the right device, partition it, label it <code>SD-BACKUP</code></li>
        <li><strong>Mount persistently</strong> — fstab entry by label so it survives kernel updates and device reordering</li>
        <li><strong>Backup script</strong> — dumps all Postgres databases, snapshots k3s configs, the server token, manifests, Helm data, and persistent volumes — all datestamped so every backup is a separate snapshot</li>
        <li><strong>One-command restore</strong> — insert the card, mount it, run <code>sudo restore-k3s</code>, and your entire cluster comes back. This is the <em>vagrant up</em> equivalent for your k3s cluster</li>
        <li><strong>Daily automation</strong> — cron jobs at 2 AM with automatic 90-day rotation</li>
        <li><strong>Health verification</strong> — filesystem checks, SD card wear monitoring, and dry-run restore tests so you know the backup is actually restorable</li>
      </ul>

      <h4>The Philosophy</h4>
      <p>
        <strong>If you cannot restore from it, it is not a backup.</strong> Every step in this
        module includes a verification command. After creating the backup script, you run a
        test restore. After setting up the cron job, you check the log. After a month, you
        dry-run the tarball. A backup card with undetected corruption is <em>worse</em> than no
        backup — it gives you false confidence. The restore script is the real artifact here;
        the backup script is just the input.
      </p>
    `,
  },

  // ── The Three Rules of Backup ─────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules for SD card backups on a Pi 5:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Label, don't hardcode.</strong> Use <code>LABEL=SD-BACKUP</code> in fstab,
            not <code>/dev/mmcblk1p1</code>. Device nodes change after kernel updates — the
            label survives.</li>
        <li><strong>Datestamp every backup.</strong> Never overwrite the last backup. A 128 GB
            card holds months of daily snapshots. Disk is cheaper than regret.</li>
        <li><strong>Test the restore.</strong> Run <code>tar -tzf</code> on the latest archive
            once a month. A corrupted tarball still shows up in <code>ls</code> — only
            decompression reveals the truth.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: HARDWARE — DETECT & IDENTIFY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Hardware — Detecting the Card',
    content: `
      <p>
        <strong>The Pi 5 SD card slot is on the underside, near the PCIe connector.</strong>
        Insert the Samsung 128 GB microSD card — push until you feel the spring click. The Pi
        detects it immediately via the MMC subsystem; no reboot required. But before you
        partition anything, you must <em>confirm</em> you are looking at the right device.
        Mistaking your boot drive (<code>nvme0n1</code> on an M.2 SSD, or <code>mmcblk0</code> if booting from SD) for the backup card means wiping
        your OS. These three commands eliminate that risk.
      </p>
      <p>
        <strong>Expected result:</strong> a new <code>mmcblk</code> device at ~119 GiB with
        model string containing "Samsung", "SD128", "SC128", or "SU128". If you do not see
        this, re-seat the card — the Pi 5 slot can be stiff.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'hardware',
    sectionTitle: 'SD Card — Detect & Identify',
    items: [
      {
        id: 900,
        commandTitle: 'Insert & Detect the Samsung microSD Card',
        command: 'dmesg | tail -20',
        searchTerms: 'dmesg sd card detect kernel log insert mmcblk samsung',
        description: 'After physically inserting the Samsung microSD card into the Pi 5\'s card slot (underside, near the PCIe connector), run this to confirm the kernel recognised it. Look for <code>mmc0</code> or a new <code>mmcblk</code> device in the output.',
        parts: [
          { text: 'dmesg',    explanation: 'prints the kernel ring buffer — all hardware events since boot' },
          { text: 'tail -20', explanation: 'last 20 lines — enough to catch the insertion event without drowning in boot logs' },
        ],
        example: '[ 2354.123456] mmc0: new high speed SDXC card at address aaaa\n[ 2354.145678] mmcblk1: mmc0:aaaa SC128 119 GiB\n[ 2354.156789]  mmcblk1: p1',
        why: 'If you see a new <code>mmcblk</code> device with capacity ~119 GiB, the Pi sees your Samsung 128GB (100GB usable after filesystem overhead) card. If nothing appears, re-seat the card — the Pi 5 slot is firm, push until you feel the spring click.',
      },
      {
        id: 901,
        commandTitle: 'List All Block Devices',
        command: 'lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL',
        searchTerms: 'lsblk block devices list size type mountpoint model identify sd card',
        description: 'Lists every storage device the Pi sees: the boot drive, any other storage, and the Samsung SD card in the underside slot. The card typically appears as <code>mmcblk0</code> or <code>mmcblk1</code> with type <code>disk</code> and no mountpoint.',
        parts: [
          { text: 'lsblk',  explanation: 'list block devices — disks, partitions, and loop devices' },
          { text: '-o NAME,SIZE,TYPE,MOUNTPOINT,MODEL', explanation: 'output columns: name, human-readable size, device type, where it\'s mounted, and the hardware model string' },
        ],
        example: 'NAME        SIZE TYPE  MOUNTPOINT   MODEL\nnvme0n1   476.9G disk               Samsung SSD 980 PRO\n├─nvme0n1p1  512M part  /boot/firmware\n└─nvme0n1p2  476G part  /\nmmcblk0   119.1G disk               SD128\n\n# Boot drive: nvme0n1 (512 GB M.2 SSD, mounted at /)\n# Backup card: mmcblk0, 119.1G, type "disk", no mountpoint — this is your target.',
        why: 'Before partitioning, verify the card has <strong>no existing partitions</strong> you care about. The <code>MODEL</code> column confirms it\'s the Samsung card (often shows as <code>SD128</code>, <code>SC128</code>, or <code>SU128</code>). <strong>Do not proceed</strong> if you\'ve mistaken your boot drive (nvme0n1, mounted at /) for the backup card.',
      },
      {
        id: 902,
        commandTitle: 'Check Card Details (Size, Vendor, Speed)',
        command: 'sudo fdisk -l /dev/mmcblk1',
        searchTerms: 'fdisk list sd card details size model sector speed samsung',
        description: 'Shows exact disk geometry and identifies the Samsung card by model string. Confirm you see <code>Samsung</code> or <code>SD128</code> in the output before partitioning.',
        parts: [
          { text: 'sudo fdisk -l',     explanation: 'list partition tables for a specific device (needs root to read the hardware)' },
          { text: '/dev/mmcblk1',      explanation: 'the backup SD card — must match what lsblk showed. If lsblk showed mmcblk2, use that instead' },
        ],
        example: 'Disk /dev/mmcblk1: 119.08 GiB, 127865454592 bytes, 249737216 sectors\nDisk model: SD128\nUnits: sectors of 1 * 512 = 512 bytes\nSector size (logical/physical): 512 bytes / 512 bytes\n\n# Key confirmations:\n# ✅ 119.08 GiB → the 128 GB Samsung card\n# ✅ Disk model: SD128 → Samsung EVO/Pro card\n# ✅ No partition table → ready to partition',
        why: 'The <code>Disk model</code> line is the definitive confirmation. If it says something other than a Samsung model, stop — you are targeting the wrong device. Never partition a disk without this confirmation.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: PARTITIONING & FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Partitioning & Formatting',
    content: `
      <p>
        <strong>One partition, one filesystem, one label.</strong> The backup card does not need
        complex partitioning — a single ext4 partition named <code>SD-BACKUP</code> is all you
        need. The label is critical: it is how fstab finds the card regardless of device node,
        and it is how you (a human) recognise the card if you ever need to plug it into another
        Linux machine.
      </p>
      <p>
        <strong>ext4 over exFAT or FAT32.</strong> ext4 supports Linux permissions (needed for
        k3s configs owned by root), handles large files, and journals metadata — so an
        unexpected power loss does not corrupt the filesystem. The trade-off is that Windows
        and macOS cannot read it natively, but you should never need to read this card from
        anything other than a Linux machine.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'partition',
    sectionTitle: 'SD Card — Partition & Format',
    items: [
      {
        id: 910,
        commandTitle: 'Create Single ext4 Partition with Label',
        command: 'sudo parted /dev/mmcblk1 mklabel gpt mkpart primary ext4 0% 100% && sudo mkfs.ext4 -L SD-BACKUP /dev/mmcblk1p1',
        searchTerms: 'parted mkpart ext4 label format partition sd card gpt backup',
        description: 'Creates a GPT partition table, a single partition spanning the entire card, and formats it as ext4 with the label <code>SD-BACKUP</code>. The label is how fstab and mount identify the card from now on.',
        parts: [
          { text: 'parted ... mklabel gpt', explanation: 'writes a GPT partition table — modern, supports disks >2TB, more resilient than MBR' },
          { text: 'mkpart primary ext4 0% 100%', explanation: 'creates one partition from the start to the end of the disk — uses the entire card' },
          { text: 'mkfs.ext4 -L SD-BACKUP', explanation: 'formats the new partition as ext4 with a human-readable label — this label is the permanent identifier' },
        ],
        example: '# parted output:\nInformation: You may need to update /etc/fstab.\n\n# mkfs.ext4 output:\nmke2fs 1.47.0\nCreating filesystem with 31217152 4k blocks and 7806976 inodes\nFilesystem UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890\nSuperblock backups stored on blocks:\n\t32768, 98304, 163840, 229376, 294912, 819200, 884736, 1605632, 2654208, 4096000, 7962624, 11239424, 20480000, 23887872\n\n# Verify the label:\nsudo blkid /dev/mmcblk1p1\n# /dev/mmcblk1p1: LABEL="SD-BACKUP" UUID="a1b2c3d4-..." TYPE="ext4"',
        why: 'The <code>&&</code> chains the two commands — if parted fails (wrong device, card not present), mkfs.ext4 never runs. This prevents accidentally formatting the wrong partition. Always verify with <code>blkid</code> that the label matches before mounting.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: MOUNTING — PERSISTENT
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Mounting — Making It Persistent',
    content: `
      <p>
        <strong>A mount that survives reboots.</strong> The backup card must be available at
        <code>/mnt/sd-backup</code> every time the Pi boots — including after kernel updates
        that might reorder MMC device nodes. Using <code>LABEL=</code> in fstab instead of
        <code>/dev/mmcblk1p1</code> is the key: the label is burned into the filesystem
        superblock and follows the card regardless of which device node the kernel assigns.
      </p>
      <p>
        <strong>The <code>noatime</code> flag matters on flash storage.</strong> Normally, ext4
        updates the access time on every file read — which means every backup creates write
        amplification on the SD card. <code>noatime</code> disables this, reducing wear and
        slightly improving read performance. The backup script does not need access timestamps.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'mount',
    sectionTitle: 'SD Card — Mount & Persist',
    items: [
      {
        id: 920,
        commandTitle: 'Create Mount Point & Mount the Card',
        command: 'sudo mkdir -p /mnt/sd-backup && sudo mount LABEL=SD-BACKUP /mnt/sd-backup',
        searchTerms: 'mkdir mount label sd-backup sd card backup mountpoint',
        description: 'Creates the mount directory and mounts the card by its filesystem label. Using <code>LABEL=SD-BACKUP</code> instead of the device path means this command works even after a kernel update reassigns the MMC device number.',
        parts: [
          { text: 'sudo mkdir -p /mnt/sd-backup',  explanation: 'creates the mount point directory — the <code>-p</code> flag is harmless if it already exists' },
          { text: 'sudo mount LABEL=SD-BACKUP',    explanation: 'mounts by filesystem label — no need to know whether the card is mmcblk1 or mmcblk2' },
        ],
        example: '# Verify it mounted:\ndf -h /mnt/sd-backup\n# Filesystem      Size  Used Avail Use% Mounted on\n# /dev/mmcblk1p1  117G   24K  111G   1% /mnt/sd-backup\n\n# Create the backups directory:\nsudo mkdir -p /mnt/sd-backup/backups',
        why: '117G usable from a 128G card is normal — ext4 reserves 5% for root (tunable with tune2fs -m). On a dedicated backup card, you can reduce this to 1% with <code>sudo tune2fs -m 1 /dev/mmcblk1p1</code> to reclaim ~5 GB.',
      },
      {
        id: 921,
        commandTitle: 'Make Mount Permanent (fstab by LABEL)',
        command: 'echo \'LABEL=SD-BACKUP /mnt/sd-backup ext4 defaults,noatime 0 2\' | sudo tee -a /etc/fstab',
        searchTerms: 'fstab permanent mount label ext4 defaults noatime sd backup persist reboot',
        description: 'Appends an fstab entry that mounts the card automatically at every boot, referenced by its <code>SD-BACKUP</code> label. Using <code>LABEL=</code> instead of <code>/dev/mmcblk1p1</code> means the mount still works even if the device node changes after a kernel update.',
        parts: [
          { text: 'LABEL=SD-BACKUP',              explanation: 'identifies the partition by label, not by device path — survives device reordering' },
          { text: '/mnt/sd-backup',               explanation: 'where to mount it — must exist (created in the previous step)' },
          { text: 'ext4',                          explanation: 'filesystem type' },
          { text: 'defaults,noatime',             explanation: 'default mount options + noatime: doesn\'t update file access timestamps, slightly faster on flash storage' },
          { text: '0 2',                           explanation: 'dump flag (0 = no dump) and fsck order (2 = check after root, which is 1)' },
        ],
        example: '# After writing fstab, test it without rebooting:\nsudo mount -a\n# If no errors, the entry is correct.\ndf -h /mnt/sd-backup\n# Filesystem      Size  Used Avail Use% Mounted on\n# /dev/mmcblk1p1  117G   ...   ...  ...  /mnt/sd-backup\n\n# Confirm the line was appended:\ntail -1 /etc/fstab\n# LABEL=SD-BACKUP /mnt/sd-backup ext4 defaults,noatime 0 2',
        why: '<code>sudo mount -a</code> tests the fstab entry immediately. If it returns an error, fix the entry <strong>before rebooting</strong> — a bad fstab line can drop you into emergency mode on boot.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: THE BACKUP SCRIPT
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'The Backup Script',
    content: `
      <p>
        <strong>A single script that captures everything.</strong> The backup script does five
        things, in order: dumps all PostgreSQL databases (one <code>.sql</code> file per
        database), copies k3s configuration files (<code>k3s.yaml</code>, the server token,
        registries), archives the k3s manifests and Helm data directory, and tars the
        persistent volume data. Each backup lands in a datestamped directory so you never
        overwrite the last good one.
      </p>
      <p>
        <strong>The order matters.</strong> PostgreSQL dumps run first because they are the
        most time-sensitive — a <code>pg_dump</code> captures a transactionally consistent
        snapshot at the moment it runs. If the script dies halfway through, you at least have
        the database dumps. The tar of raw Postgres data files is a secondary safety net for
        disaster recovery, but the <code>.sql</code> dumps are portable across Postgres versions.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'backup',
    sectionTitle: 'SD Card — The Backup Script',
    items: [
      {
        id: 930,
        commandTitle: 'Create the Full Backup Script',
        command: 'cat > /tmp/backup-k3s.sh << \'SCRIPT\'',
        searchTerms: 'backup script k3s sd card pg dump tar config etcd one command create',
        description: 'Creates a self-contained backup script that dumps all PostgreSQL databases, snapshots k3s configs, YAML manifests, and persistent volumes — all to the SD card with a datestamped directory. Paste the content from the <strong>Example output</strong> block into your terminal.',
        parts: [
          { text: 'pg_dumpall',               explanation: 'dumps every PostgreSQL database in the cluster — one file per database in pg_dumps/' },
          { text: '/etc/rancher/k3s/',        explanation: 'the k3s config directory — contains kubeconfig, server token, registries.yaml' },
          { text: '/var/lib/rancher/k3s/',    explanation: 'k3s data directory — contains manifests, Helm charts, and the embedded etcd snapshot' },
          { text: '/mnt/k3s-data/',           explanation: 'your persistent volume data — Postgres raw files, application uploads, everything PVCs point to' },
        ],
        example: '#!/bin/bash\n# backup-k3s.sh — Full k3s cluster backup to Samsung microSD card\n# Usage: sudo ./backup-k3s.sh\nset -euo pipefail\n\nDEST="/mnt/sd-backup/backups/$(date +%Y%m%d-%H%M)"\nmkdir -p "$DEST"\n\necho "=== [1/5] Dumping PostgreSQL databases ==="\nmkdir -p "$DEST/pg_dumps"\nfor db in $(kubectl exec -it deploy/postgres -- psql -U appuser -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != \'postgres\';" 2>/dev/null | tr -d \' \' | grep -v \'^$\'); do\n  echo "  → Dumping $db..."\n  kubectl exec deploy/postgres -- pg_dump -U appuser "$db" > "$DEST/pg_dumps/${db}-$(date +%Y%m%d).sql"\ndone\n\necho "=== [2/5] Backing up k3s configs ==="\nsudo cp -a /etc/rancher/k3s/k3s.yaml "$DEST/"\nsudo cp -a /etc/rancher/k3s/registries.yaml "$DEST/" 2>/dev/null || echo "  (no registries.yaml)"\n\necho "=== [3/5] Backing up k3s server token ==="\nsudo cp -a /var/lib/rancher/k3s/server/token "$DEST/server-token"\n\necho "=== [4/5] Archiving k3s manifests & Helm data ==="\nsudo tar -czf "$DEST/k3s-manifests.tar.gz" \\\n  -C /var/lib/rancher/k3s/server/manifests . 2>/dev/null || echo "  (no custom manifests)"\n\necho "=== [5/5] Archiving persistent volume data ==="\nsudo tar -czf "$DEST/persistent-data.tar.gz" /mnt/k3s-data/\n\necho ""\necho "✅ Backup complete: $DEST"\necho "   Size: $(du -sh "$DEST" | cut -f1)"\necho ""\necho "   Files created:"\nls -lh "$DEST/"',
        why: 'The datestamped directory (<code>20260701-1430</code>) means every backup is a separate snapshot — no overwriting. A 100GB card can hold 6-12 months of daily backups before you need to rotate. Each backup is ~1-3 GB for a typical homelab.',
      },
      {
        id: 931,
        commandTitle: 'Install & Run the First Backup',
        command: 'sudo cp /tmp/backup-k3s.sh /usr/local/bin/backup-k3s && sudo chmod +x /usr/local/bin/backup-k3s && sudo backup-k3s',
        searchTerms: 'install backup script run first execute verify chmod',
        description: 'Copies the script to a system-wide bin directory, makes it executable, and runs the first backup. After this, <code>sudo backup-k3s</code> will run a full backup from anywhere.',
        parts: [
          { text: 'cp /tmp/backup-k3s.sh /usr/local/bin/backup-k3s', explanation: 'moves the script to the PATH — /usr/local/bin is for locally-installed admin tools' },
          { text: 'chmod +x',                                         explanation: 'makes the script executable — without this, bash would need to be invoked explicitly' },
          { text: 'sudo backup-k3s',                                  explanation: 'runs the backup — needs root to read k3s private configs and /mnt/k3s-data' },
        ],
        example: '=== [1/5] Dumping PostgreSQL databases ===\n  → Dumping appdb...\n=== [2/5] Backing up k3s configs ===\n=== [3/5] Backing up k3s server token ===\n=== [4/5] Archiving k3s manifests & Helm data ===\n=== [5/5] Archiving persistent volume data ===\n\n✅ Backup complete: /mnt/sd-backup/backups/20260701-1430\n   Size: 1.2G\n\n   Files created:\n-rw-r--r-- 1 root root 1.1M Jul  1 14:30 k3s-manifests.tar.gz\n-rw-r--r-- 1 root root 1.2G Jul  1 14:30 persistent-data.tar.gz\n-rw-r--r-- 1 root root  45K Jul  1 14:30 appdb-20260701.sql\n-rw-r--r-- 1 root root 2.9K Jul  1 14:30 k3s.yaml\n-rw-r--r-- 1 root root   64 Jul  1 14:30 server-token',
        why: 'Running the first backup immediately validates the entire chain: card mount, script syntax, Postgres connectivity, and write permissions. If this succeeds, cron will succeed too. If it fails, fix the issue before automating.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: ONE-COMMAND RESTORE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'One-Command Restore — Your Insurance Policy',
    content: `
      <p>
        <strong>This is the <code>vagrant up</code> equivalent for your k3s cluster.</strong>
        The backup script is the input; the restore script is the artifact that matters. If
        your boot drive fails, you flash a fresh Raspberry Pi OS onto a new drive, install k3s, insert the
        backup card, mount it, and run a single command. Your entire cluster — configs, Postgres
        data, persistent volumes, manifests — comes back.
      </p>
      <p>
        <strong>Design principle: check, then restore.</strong> The restore script verifies
        each file exists before restoring it, so missing optional pieces (e.g., no custom
        manifests) do not block the restore. It stops Postgres cleanly before overwriting its
        data directory, copies everything into place, restarts services, and then runs a
        health-check smoke test against the Node.js API.
      </p>
      <p>
        <strong>Print this script and keep a physical copy with the SD card.</strong> When you
        need it, you will not have access to this website. The script is self-contained — no
        external dependencies beyond a standard Linux toolchain and kubectl.
      </p>
    `,
  },

  {
    type: 'note',
    variant: 'warning',
    content: `
      <strong>⚠️ The restore script overwrites live data.</strong> It stops the Postgres pod,
      deletes the existing <code>/mnt/k3s-data/</code> contents, and replaces them with the
      backup. Only run this on a freshly installed k3s cluster or when you have accepted that
      current data will be lost. Test it in a non-production context first.
    `,
  },

  {
    type: 'commands',
    section: 'restore',
    sectionTitle: 'SD Card — One-Command Restore',
    items: [
      {
        id: 940,
        commandTitle: 'Create the One-Command Restore Script',
        command: 'cat > /tmp/restore-k3s.sh << \'SCRIPT\'',
        searchTerms: 'restore k3s cluster backup sd card postgres pg_restore config one command vagrant up equivalent',
        description: 'Creates the restore script. Takes one argument — the path to a backup directory — and restores every component: k3s configs, server token, manifests, PostgreSQL databases, and persistent volumes. Paste the content from the <strong>Example output</strong> block into your terminal.',
        parts: [
          { text: 'cp k3s.yaml → /etc/rancher/k3s/',            explanation: 'restores the kubeconfig so kubectl works immediately' },
          { text: 'cp server-token → /var/lib/rancher/k3s/',    explanation: 'restores the cluster identity token — k3s uses this to validate nodes' },
          { text: 'tar -xzf persistent-data.tar.gz',            explanation: 'extracts the raw Postgres data directory back to /mnt/k3s-data/' },
          { text: 'pg_restore / kubectl rollout restart',       explanation: 'imports SQL dumps into Postgres, then restarts pods to pick up the restored data' },
        ],
        example: '#!/bin/bash\n# restore-k3s.sh — One-command k3s cluster restore from Samsung microSD card\n# Usage: sudo restore-k3s /mnt/sd-backup/backups/20260701-1430\nset -euo pipefail\n\nBACKUP_DIR="${1:?Usage: sudo restore-k3s /path/to/backup/dir}"\n\necho "=== Restoring k3s cluster from: $BACKUP_DIR ==="\n\n# 1. Restore k3s configs\necho "[1/5] Restoring k3s configs..."\nsudo cp "$BACKUP_DIR/k3s.yaml" /etc/rancher/k3s/k3s.yaml\nsudo chmod 644 /etc/rancher/k3s/k3s.yaml\n[ -f "$BACKUP_DIR/registries.yaml" ] && sudo cp "$BACKUP_DIR/registries.yaml" /etc/rancher/k3s/registries.yaml\n\n# 2. Restore k3s server token\necho "[2/5] Restoring k3s server token..."\nsudo cp "$BACKUP_DIR/server-token" /var/lib/rancher/k3s/server/token\n\n# 3. Restore k3s manifests\necho "[3/5] Restoring k3s manifests & Helm data..."\nif [ -f "$BACKUP_DIR/k3s-manifests.tar.gz" ]; then\n  sudo mkdir -p /var/lib/rancher/k3s/server/manifests\n  sudo tar -xzf "$BACKUP_DIR/k3s-manifests.tar.gz" -C /var/lib/rancher/k3s/server/manifests/\nfi\n\n# 4. Restore persistent volume data\necho "[4/5] Restoring persistent volume data..."\nif [ -f "$BACKUP_DIR/persistent-data.tar.gz" ]; then\n  # Stop Postgres before overwriting its data\n  kubectl scale deployment postgres --replicas=0 2>/dev/null || true\n  sleep 5\n  sudo rm -rf /mnt/k3s-data/*\n  sudo tar -xzf "$BACKUP_DIR/persistent-data.tar.gz" -C /\n  kubectl scale deployment postgres --replicas=1 2>/dev/null || true\n  sleep 10\nfi\n\n# 5. Restore PostgreSQL databases from SQL dumps\necho "[5/5] Restoring PostgreSQL databases..."\nif [ -d "$BACKUP_DIR/pg_dumps" ]; then\n  for dump in "$BACKUP_DIR/pg_dumps"/*.sql; do\n    dbname=$(basename "$dump" | sed \'s/-[0-9]*\\.sql$//\')\n    echo "  → Restoring $dbname..."\n    kubectl exec -i deploy/postgres -- psql -U appuser -d "$dbname" < "$dump" 2>/dev/null || \\\n      kubectl exec -i deploy/postgres -- psql -U appuser -c "CREATE DATABASE $dbname;" && \\\n      kubectl exec -i deploy/postgres -- psql -U appuser -d "$dbname" < "$dump"\n  done\nfi\n\necho ""\necho "✅ Restore complete. Restarting application pods..."\nkubectl rollout restart deployment/node-api 2>/dev/null || true\necho ""\necho "Smoke test: curl -s http://localhost/health"',
        why: 'This is the <code>vagrant up</code> equivalent for your k3s cluster. Insert the SD card, mount it, run <code>sudo restore-k3s /mnt/sd-backup/backups/20260701-1430</code>, and your entire cluster comes back — configs, Postgres data, persistent volumes, everything. The script checks each file\'s existence so missing optional pieces (e.g., no custom manifests) don\'t block the restore.',
      },
      {
        id: 941,
        commandTitle: 'Install the Restore Script',
        command: 'sudo cp /tmp/restore-k3s.sh /usr/local/bin/restore-k3s && sudo chmod +x /usr/local/bin/restore-k3s',
        searchTerms: 'install restore script chmod cp bin path system-wide',
        description: 'Makes <code>restore-k3s</code> available globally. After this, any administrator can run <code>sudo restore-k3s /mnt/sd-backup/backups/20260701-1430</code> to perform a full cluster restore.',
        parts: [
          { text: 'cp ... /usr/local/bin/', explanation: 'places the script where all users can run it (in the default PATH)' },
          { text: 'chmod +x',               explanation: 'makes it directly executable — no need to type \'bash restore-k3s\'' },
        ],
        example: '# Now usable from anywhere:\nsudo restore-k3s /mnt/sd-backup/backups/20260701-1430\n\n# With tab-completion on the directory name:\nsudo restore-k3s /mnt/sd-backup/backups/202607<TAB>\n# → /mnt/sd-backup/backups/20260701-1430',
        why: 'The restore script is your disaster recovery tool. Print it and keep a physical copy with the SD card. If the Pi\'s boot drive fails, you flash a new Pi OS onto a replacement drive, install k3s, insert the backup card, and run one command.',
      },
      {
        id: 942,
        commandTitle: 'Verify Restored Cluster Health',
        command: 'kubectl get nodes && echo \'---\' && kubectl get pods -A && echo \'---\' && kubectl get pvc',
        searchTerms: 'verify restore cluster health nodes pods pvc postgres healthy ready',
        description: 'Runs the three most important health checks after a restore: node status (must show <code>Ready</code>), pod status across all namespaces, and PersistentVolumeClaim binding (must show <code>Bound</code>).',
        parts: [
          { text: 'kubectl get nodes',   explanation: 'confirms the cluster node is Ready — the foundation of everything else' },
          { text: 'kubectl get pods -A', explanation: 'checks every pod in every namespace — all should be Running or Completed' },
          { text: 'kubectl get pvc',     explanation: 'verifies the PVC for Postgres is Bound — means the restored /mnt/k3s-data is intact and readable' },
        ],
        example: 'NAME       STATUS   ROLES                  AGE     VERSION\npi5-k3s    Ready    control-plane,master   5m      v1.29.5+k3s1\n---\nNAMESPACE     NAME                              READY   STATUS\ndefault       postgres-7f8d9c6b5-abc12          1/1     Running\ndefault       node-api-5g6h7j8k9-def34          1/1     Running\nkube-system   coredns-57f9d8c6b5-ghi56          1/1     Running\nkube-system   traefik-7d6f8g9h0-jkl78           1/1     Running\nkube-system   local-path-provisioner-abc12       1/1     Running\n---\nNAME           STATUS   VOLUME        CAPACITY\ndatabase-pvc   Bound    database-pv   5Gi',
        why: 'If all three show healthy (Ready + Running + Bound), the restore succeeded. If any pod is CrashLoopBackOff, check <code>kubectl logs</code> — the most common issue is Postgres version mismatch between the dump and the restored instance. Use <code>pg_dump</code> dumps (portable) rather than raw data files (version-locked).',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: AUTOMATION
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Automation — Set It and Forget It',
    content: `
      <p>
        <strong>A backup you have to remember to run is a backup that will not exist when you
        need it.</strong> The cron system on the Pi 5 is simple and reliable — it has been
        running backups on Unix systems for 50 years. Two cron jobs cover the full lifecycle:
        a nightly backup at 2 AM (when the cluster is idle and Postgres sees minimal write
        activity), and a weekly cleanup at 3 AM on Sundays that deletes backups older than
        90 days.
      </p>
      <p>
        <strong>Why 2 AM?</strong> The Pi 5 runs 24/7. At 2 AM local time, the cluster load is
        near zero — no HTTP requests, no active Postgres transactions, minimal filesystem
        activity. The <code>pg_dump</code> captures a clean snapshot without competing with
        application writes. If 2 AM does not work for your timezone or usage pattern, adjust
        the hour — the principle (run backups during the quietest window) matters more than
        the specific time.
      </p>
      <p>
        <strong>Why 90-day retention?</strong> A daily backup is ~1-3 GB on a typical homelab.
        90 backups is ~90-270 GB — within the 100 GB usable capacity but not by a wide margin.
        Adjust to 30 days if space is tight, or 180 days if you have headroom. The cleanup cron
        job is your capacity management — without it, the card fills up silently and backups
        start failing.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'automation',
    sectionTitle: 'SD Card — Daily Automation',
    items: [
      {
        id: 950,
        commandTitle: 'Add a Daily Cron Job',
        command: 'echo \'0 2 * * * root /usr/local/bin/backup-k3s >> /var/log/k3s-backup.log 2>&1\' | sudo tee /etc/cron.d/k3s-backup',
        searchTerms: 'cron daily backup automate 2am schedule crontab k3s',
        description: 'Creates a cron job that runs the backup every night at 2:00 AM — when the cluster is idle and Postgres sees minimal write activity. Output is logged to a dedicated file for later inspection.',
        parts: [
          { text: '0 2 * * *',              explanation: 'cron schedule: minute=0, hour=2, every day, every month, every weekday. 2 AM local server time.' },
          { text: 'root',                    explanation: 'runs as root — needed to read k3s configs and write to /mnt/sd-backup' },
          { text: '/etc/cron.d/k3s-backup',  explanation: 'the drop-in directory for system cron jobs — cleaner than editing root\'s crontab' },
          { text: '>> /var/log/k3s-backup.log 2>&1', explanation: 'appends both stdout and stderr to a log file so you can debug failed backups' },
        ],
        example: '# Verify cron picked it up:\nsudo run-parts --test /etc/cron.d\n# Output should include: /etc/cron.d/k3s-backup\n\n# Check the log after the first automated run:\nsudo cat /var/log/k3s-backup.log\n# === [1/5] Dumping PostgreSQL databases ===\n#   → Dumping appdb...\n# ...\n# ✅ Backup complete: /mnt/sd-backup/backups/20260702-0200',
        why: '2 AM is chosen because the Pi 5 runs 24/7 and cluster load is near zero at that hour. Cron requires a trailing newline — make sure the echo command includes one (the shell adds it automatically).',
      },
      {
        id: 951,
        commandTitle: 'Add Auto-Cleanup of Old Backups',
        command: 'echo \'0 3 * * 0 root find /mnt/sd-backup/backups/ -maxdepth 1 -type d -mtime +90 -exec rm -rf {} \\;\' | sudo tee /etc/cron.d/k3s-backup-cleanup',
        searchTerms: 'cleanup old backups retention rotation 90 days auto delete cron',
        description: 'Adds a weekly cleanup job (Sunday at 3 AM) that deletes backup directories older than 90 days. This prevents the card from filling up — 90 days of daily backups is ~90-270 GB, well within the 100 GB card.',
        parts: [
          { text: '0 3 * * 0',     explanation: 'weekly: 3 AM every Sunday' },
          { text: '-mtime +90',    explanation: 'files/directories modified more than 90 days ago — adjustable; change to +30 for a 30-day rotation' },
          { text: '-exec rm -rf',  explanation: 'deletes matching directories — safe because we constrained to exactly the backups/ directory with -maxdepth 1' },
        ],
        example: '# Manually see what would be deleted (dry run):\nfind /mnt/sd-backup/backups/ -maxdepth 1 -type d -mtime +90\n# /mnt/sd-backup/backups/20260401-0200\n# /mnt/sd-backup/backups/20260402-0200\n\n# Tune retention: edit /etc/cron.d/k3s-backup-cleanup\n# Change +90 to +180 for 6 months, or +7 for one week.',
        why: '90 days is conservative for a home lab. Adjust to 30 days if you\'re tight on space, or 180 days if you want a longer history. The <code>-maxdepth 1</code> guard ensures <code>rm -rf</code> can\'t wander outside the backups directory.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: HEALTH & VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Health & Verification — Trust But Verify',
    content: `
      <p>
        <strong>A backup card with undetected corruption is worse than no backup.</strong> It
        gives you false confidence. Three verification procedures, run monthly, catch the
        three failure modes that silently destroy your backup capability: filesystem corruption
        (from unexpected power loss or bit rot), SD card wear-out (from write cycle exhaustion),
        and tarball corruption (from incomplete writes or media errors).
      </p>
      <p>
        <strong>SD cards are not SSDs.</strong> They have simpler controllers, fewer spare
        blocks, and no TRIM support. A Samsung EVO card is rated for thousands of write cycles,
        but daily backups write 1-3 GB — over 5 years that is ~2-5 TB, well within the rating
        of a modern card. The <code>mmc extcsd</code> check reads the card's own internal wear
        counter so you know exactly where you stand.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'verify',
    sectionTitle: 'SD Card — Health & Verification',
    items: [
      {
        id: 960,
        commandTitle: 'Check Card Filesystem Health',
        command: 'sudo fsck -n /dev/mmcblk1p1',
        searchTerms: 'fsck check filesystem health sd card verify corruption errors',
        description: 'Runs a read-only (<code>-n</code>) filesystem check on the backup card to detect corruption or bit rot before you need to rely on it for a restore. Does not modify anything.',
        parts: [
          { text: 'fsck',  explanation: 'filesystem consistency check — the ext4 equivalent of chkdsk' },
          { text: '-n',    explanation: 'no-write mode — reports problems without attempting repairs (safe on a mounted filesystem if you\'re just checking)' },
        ],
        example: 'e2fsck 1.47.0\nSD-BACKUP: clean, 245/31217152 files, 1890234/31217152 blocks\n\n# If it shows errors like:\n# SD-BACKUP: ********** WARNING: Filesystem still has errors **********\n# → Unmount the card (sudo umount /mnt/sd-backup) and run:\n# sudo fsck -y /dev/mmcblk1p1   (the -y auto-answers yes to repairs)',
        why: 'Run this once a month. SD cards silently corrupt more often than SSDs — a backup card with undetected corruption is worse than no backup at all (it gives false confidence).',
      },
      {
        id: 961,
        commandTitle: 'Check Card Wear & Lifespan',
        command: 'sudo apt install -y mmc-utils && sudo mmc extcsd read /dev/mmcblk1 | grep -E \'LIFE|PRE_EOL|WEAR\'',
        searchTerms: 'mmc extcsd wear level lifespan sd card health pre_eol life time',
        description: 'Reads the MMC extended CSD register from the Samsung card to report wear-out information. The <code>PRE_EOL_INFO</code> field tells you if the card is healthy (0x01 = normal), near end-of-life (0x02 = warning), or failing (0x03 = urgent).',
        parts: [
          { text: 'mmc-utils',  explanation: 'package containing mmc — the tool for reading MMC/SD card internal registers' },
          { text: 'mmc extcsd read', explanation: 'reads the extended Card-Specific Data register — low-level hardware info from the card\'s controller' },
          { text: 'PRE_EOL_INFO',   explanation: 'Pre-End-of-Life Information — the key field. 0x01 = healthy, 0x02 = 80% of rated writes used, 0x03 = exceeding rating' },
        ],
        example: 'PRE_EOL_INFO: 0x01\n# 0x01 → card is healthy. No action needed.\n\n# If 0x02 (warning):\n# → The card has used ~80% of its rated write cycles.\n# → Plan to replace it. Keep a second card and rotate between them.\n\n# If 0x03 (urgent):\n# → Replace immediately — data loss is likely within weeks.',
        why: 'The Samsung EVO/Pro cards are rated for thousands of write cycles, but daily backups write ~1-3 GB per day. At that rate, even a modest card should last 5+ years. This check confirms the reality matches the rating.',
      },
      {
        id: 962,
        commandTitle: 'Dry-Run Restore (Verify Backup Integrity)',
        command: 'sudo tar -tzf /mnt/sd-backup/backups/$(ls -t /mnt/sd-backup/backups/ | head -1)/persistent-data.tar.gz | head -20',
        searchTerms: 'tar test backup integrity dry run verify content list without extracting',
        description: 'Lists the contents of the most recent persistent-data archive without extracting it. This proves the archive isn\'t corrupted and contains the expected directories before you ever need it.',
        parts: [
          { text: 'tar -tzf',  explanation: 'test/list (-t) a gzip archive (-z) from file (-f) — reads the full archive to verify it\'s intact' },
          { text: '$(ls -t ... | head -1)', explanation: 'shell substitution that picks the newest backup directory — no need to type the date' },
          { text: 'head -20',  explanation: 'shows just the first 20 entries — enough to confirm the structure without flooding the terminal' },
        ],
        example: 'mnt/k3s-data/\nmnt/k3s-data/databases/\nmnt/k3s-data/databases/postgres/\nmnt/k3s-data/databases/postgres/base/\nmnt/k3s-data/databases/postgres/pg_wal/\nmnt/k3s-data/applications/\n\n# If tar reports errors like:\n# gzip: stdin: unexpected end of file\n# tar: Child returned status 1\n# → The archive is corrupted. Delete this backup and investigate:\n# ls -lh /mnt/sd-backup/backups/*/persistent-data.tar.gz\n# Look for files with zero size or unusually small size.',
        why: 'A corrupted tarball will still show up in <code>ls</code> — it looks like a backup but isn\'t. The <code>tar -t</code> test actually decompresses and reads the entire stream, catching bit rot and incomplete writes. Run this monthly.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: COMPLETE WORKFLOW CHECKLIST
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Complete Workflow — Are We Good?',
    content: `
      <p>
        <strong>One command to confirm the entire backup system is operational.</strong> After
        a Pi OS reinstall, a k3s upgrade, or just a routine check, this one-liner verifies both
        scripts are installed and counts how many backups exist on the card. When you see both
        checkmarks, the SD card backup system is fully operational — insert card, mount, restore.
      </p>
      <p>
        <strong>Run this after any major change.</strong> If you reinstall Pi OS, reinstall k3s,
        or swap the backup card for a new one, run this command. It catches the two most common
        silent failures: scripts that were not copied to the new system, and a card that is not
        mounted.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'workflow',
    sectionTitle: 'SD Card — Complete Workflow',
    items: [
      {
        id: 970,
        commandTitle: 'Full Setup: Card → Backup → Restore (End-to-End)',
        command: 'cat /usr/local/bin/backup-k3s > /dev/null && cat /usr/local/bin/restore-k3s > /dev/null && echo \'Both scripts installed ✓\' && ls -d /mnt/sd-backup/backups/*/ 2>/dev/null | wc -l | xargs echo \'Backups stored:\'',
        searchTerms: 'end to end full workflow verify completed setup backup restore scripts',
        description: 'Quick end-to-end check: verifies both scripts are installed and counts how many backups exist on the card. When you see both checkmarks, the SD card backup system is fully operational.',
        parts: [
          { text: 'cat ... > /dev/null', explanation: 'checks the file exists and is readable — discards output, only cares about exit code' },
          { text: 'ls -d ... | wc -l',  explanation: 'counts backup directories silently — if the card isn\'t mounted, this returns 0 without error' },
        ],
        example: 'Both scripts installed ✓\nBackups stored: 3\n\n# If you see "Backups stored: 0", the card might not be mounted:\ndf -h /mnt/sd-backup\n# Mount it if needed: sudo mount -a',
        why: 'This is the one-liner you run after a Pi OS reinstall to confirm the backup system survived. Install k3s, insert the card, mount it, run this — and your full restore capability is ready.',
      },
    ],
  },

  // ── Closing ───────────────────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>🖨️ Print the restore script.</strong> The restore script in this module is your
      disaster recovery tool. Print it and keep a physical copy with the Samsung SD card. When
      the boot drive fails and you are flashing a fresh Pi OS onto a replacement, you will not have browser access to
      this page. The script is self-contained — all it needs is bash, kubectl, and the backup
      card mounted at <code>/mnt/sd-backup</code>.
    `,
  },

];
