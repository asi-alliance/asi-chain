# AWS Lightsail Server Specifications

## Server Details
- **Public IP:** 54.254.197.253
- **Private IP:** 172.26.7.248
- **Hostname:** ip-172-26-7-248.ap-southeast-1.compute.internal
- **Region:** ap-southeast-1 (Asia Pacific - Singapore)
- **Platform:** AWS Lightsail
- **Instance Type:** Virtual Machine (KVM)

## Operating System
- **OS:** Ubuntu 22.04.5 LTS (Jammy Jellyfish)
- **Kernel:** Linux 6.8.0-1030-aws #32~22.04.1-Ubuntu SMP
- **Architecture:** x86_64 (64-bit)

## CPU Specifications
- **Model:** Intel(R) Xeon(R) Platinum 8175M CPU @ 2.50GHz
- **CPU Cores:** 4 physical cores
- **CPU Threads:** 8 threads (2 threads per core)
- **Sockets:** 1
- **CPU Family:** 6, Model 85, Stepping 4
- **Cache:**
  - L1d: 128 KiB (4 instances)
  - L1i: 128 KiB (4 instances)
  - L2: 4 MiB (4 instances)
  - L3: 33 MiB (shared)
- **Features:** AVX, AVX2, AVX512, AES-NI, SSE4.2, FMA
- **Virtualization:** Full virtualization (KVM hypervisor)

## Memory
- **Total RAM:** 32 GB (31.0 GiB / 32,484,156 KB)
- **Available:** ~30 GiB
- **Used:** ~359 MiB (at initial login)
- **Swap:** None configured
- **Memory Type:** System memory

## Storage
- **Primary Disk:** /dev/nvme0n1 (NVMe SSD)
- **Total Size:** 640 GB
- **Partitions:**
  - Root partition (/): 639.9 GB (621 GB usable, 1.8 GB used - 1% usage)
  - EFI partition (/boot/efi): 106 MB
- **Storage Type:** Amazon Elastic Block Store (EBS) via NVMe
- **Filesystem:** ext4 (root partition)

## Network Configuration
- **Network Interface:** ens5 (Elastic Network Adapter - ENA)
- **MAC Address:** 06:4b:bb:0c:c6:35
- **MTU:** 9001 (Jumbo frames enabled)
- **IPv4 Configuration:**
  - Private IP: 172.26.7.248/20
  - Gateway: 172.26.0.1
  - DHCP: Enabled
- **IPv6 Configuration:**
  - Global: 2406:da18:bb2:3e00:9d7f:a4af:cc7b:f74a/128
  - Link-local: fe80::44b:bbff:fe0c:c635/64
- **DNS:** Managed by systemd-resolved

## System Services
- **Init System:** systemd
- **Active Services:**
  - SSH Server (OpenSSH)
  - systemd-networkd (Network management)
  - systemd-resolved (DNS resolver)
  - snapd (Snap package management)
  - Amazon SSM Agent
  - Unattended upgrades
  - Cron scheduler
  - Multipath daemon
  - IRQ balancer

## System Performance
- **BogoMIPS:** 4999.99
- **NUMA Nodes:** 1
- **CPU Governor:** Default (likely ondemand or performance)

## Security Features
- **Mitigations:**
  - Meltdown: PTI enabled
  - Spectre v1: usercopy/swapgs barriers
  - Spectre v2: Retpolines enabled
  - L1tf: PTE Inversion
- **Vulnerabilities:**
  - MDS: Vulnerable (no microcode update)
  - Retbleed: Vulnerable
  - Spec store bypass: Vulnerable

## Pre-installed Software
- **Snap Packages:**
  - core20 (v2599)
  - core22 (v2010)
  - amazon-ssm-agent (v11320)
  - lxd (v31333)
  - snapd (v24718)
- **System Management:**
  - Unattended upgrades configured
  - Amazon SSM Agent for remote management
  - Network dispatcher for network events

## System State at First Login
- **Uptime:** Fresh boot (first login)
- **Load Average:** 0.0
- **Running Processes:** 152
- **Memory Usage:** ~1% (359 MiB of 32 GB)
- **Disk Usage:** 0.3% (1.8 GB of 620 GB)
- **Updates:** System indicates updates may be available

## Notes
- This is a fresh AWS Lightsail instance with minimal configuration
- Jumbo frames (MTU 9001) are enabled for optimal network performance
- The instance uses NVMe storage for high I/O performance
- No swap space configured (typical for cloud instances with sufficient RAM)
- Instance is ready for application deployment

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
