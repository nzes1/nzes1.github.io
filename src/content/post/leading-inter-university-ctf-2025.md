---
layout: ../../layouts/post.astro
title: Leading Infrastructure & Challenge Design for an Inter-University CTF (2025)
description: Led the end-to-end technical delivery of I&M Bank's Inter-university CTF, designing resilient infrastructure, implementing improvised high availability for CTFd, and authoring multiple DevSecOps-themed challenges for over 50 university participants.
dateFormatted: Jan 7, 2026
category: "lab"
---

---

## Overview

In 2025, I led the technical planning and execution of I&M Bank’s annual inter-university Capture The Flag (CTF) competition — an invite-only event attended by over 50 students from major Kenyan universities including JKUAT, DeKUT, KCA Univeristy, MMU, TUK, and KU.

Unlike previous years, I took ownership of the entire technical delivery of the event — from infrastructure design and high availability planning to challenge development, review standards, and live event continuity.

This experience combined what I value most in security:

* Offensive thinking
* DevSecOps awareness
* Platform reliability
* Education and mentorship
* Leadership under operational pressure

---

## Designing the Infrastructure: Reliability First

### Hosting Strategy

My first task was selecting infrastructure providers that balanced: *Cost efficiency, Performance, Reliability* and *Geographic availability*

After evaluation, I selected:

* **Contabo** as the primary host (strong resource-to-cost ratio)
* **Linode** as a standby instance for high availability

Both instances were provisioned with ***Debian 12***.


#### *Platform Selection & Container Management*

I selected **CTFd** as the competition platform due to its flexibility and extensibility.

To ensure maintainability and future scalability, I:

* Installed Docker for containerized management
* Deployed Portainer for visual container administration
* Secured Portainer access via an Nginx authentication proxy
* Configured CTFd using best-practice deployment standards

To prepare for failover, I replicated the entire CTFd configuration on the Linode instance.


### Improvising High Availability (CTFd Has No Native HA)

CTFd does not provide built-in high availability or live replication.
That meant I had to design my own continuity strategy.

#### *The Core Problem*

If the primary server failed mid-competition:

* All progress could be lost
* Scores could become inconsistent
* Participant trust could be damaged

I needed a recovery model with **minimal tolerance for data loss**.


#### *My Solution: Automated Export-Based Failover*

After analyzing how CTFd’s export functionality works (inspecting traffic via Burp), I discovered:

* Exports require an authenticated admin session cookie
* The export endpoint can be invoked programmatically

This led me to design an automated backup system.

#### *Strategy*

* Trigger a full CTFd export every **3 minutes**
* Store the exports locally
* Retain the most recent 3 backups
* Keep Linode prepared to import the latest snapshot instantly

This reduced worst-case data loss to **under 3 minutes**.

If downtime occurred within that window, we could simply allow participants to re-submit flags identified in the previous few minutes.


#### *Automated Export Script*

```bash
#!/bin/bash

# ==========================================================
# CTFd Automated Backup Script
# Purpose: Export CTFd state every 3 minutes for HA recovery
# ==========================================================

# === CONFIGURATION ===
SAVE_DIR="/home/{my-username}/ctfd-local/ctfd_backups"
COOKIE="ADMIN_SESSION_COOKIE"
CTFD_URL="http://{contabo-instance-ip-port}/admin/export"
LOG_FILE="$SAVE_DIR/ctfd_curl.log"

# === PREPARATION ===
mkdir -p "$SAVE_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="$SAVE_DIR/ctfd_export_${TIMESTAMP}.zip"

echo "[ $(date +"%Y-%m-%d %H:%M:%S") ] Starting export..." >> "$LOG_FILE"

# === EXPORT REQUEST ===
curl -s -L --fail --compressed \
     -o "$OUTPUT_FILE" \
     -H "Cookie: session=${COOKIE}" \
     -H "User-Agent: Mozilla/5.0" \
     "$CTFD_URL"

# === VALIDATION ===
if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
    SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "[ $(date +"%Y-%m-%d %H:%M:%S") ] Export saved successfully: $OUTPUT_FILE ($SIZE)" >> "$LOG_FILE"
else
    echo "[ $(date +"%Y-%m-%d %H:%M:%S") ] Export failed" >> "$LOG_FILE"
    rm -f "$OUTPUT_FILE"
fi
```

Scheduled via `cron` every 3 minutes.

---

## Challenge Development & Review Standards

Beyond infrastructure, I coordinated challenge development across AppSec team members and SOC team contributors.

I established internal standards for:

* Flag format consistency
* Difficulty progression
* Educational value
* Write-up clarity
* Operational safety

I reviewed challenges and write-ups to ensure alignment before publishing.


## My Own Challenge Contributions

I personally authored **five challenges**, including:


### *1. Scope & Rules Awareness (Housekeeping)*

From a red team perspective, understanding scope is foundational.

I embedded a flag within the competition rules page, reinforcing the principle:

> Always understand scope and terms of engagement before engaging.

Write-up:
[Housekeeping CTF Challenge Write-up](https://github.com/InvisiTech-Labs/I-MBank_CTF_writeups/blob/main/Miscellaneous/Housekeeping/Housekeeping.md)

### *2. Steganography — "Years of Legacy"*

A themed steganography challenge referencing the Bank’s 50-year milestone.

Participants had to:

* Extract hidden data
* Interpret contextual clues
* Use decoding logic tied to business hints

Write-up:
[Steg Challenge Write-up](https://github.com/InvisiTech-Labs/I-MBank_CTF_writeups/blob/main/Steganography/Years_of_legacy/Years_of_legacy.md)



### *3. DevSecOps Mission: Version Control Exposure*

This was my most structured challenge series.

The scenario simulated:

* OSINT investigation
* Developer behavior analysis
* Git repository mismanagement
* Container exposure
* Secrets leakage

Participants followed a narrative beginning with a blurred LinkedIn artifact and traced it to GitHub organizations, commit history, and container exposures.

Initial Artifact:
[LinkedIn Artifact Image](https://github.com/InvisiTech-Labs/I-MBank_CTF_writeups/blob/main/Version_Control/The_Trail_Begins/image-4.png)

Challenge Write-ups:

* [The Trail Begins](https://github.com/InvisiTech-Labs/I-MBank_CTF_writeups/blob/main/Version_Control/The_Trail_Begins/The%20Trail%20Begins.md)
* [Makaveli the Committer](https://github.com/InvisiTech-Labs/I-MBank_CTF_writeups/blob/main/Version_Control/Makaveli_the_Committer/Makaveli%20the%20committer.md)
* [Dock and Leak](https://github.com/InvisiTech-Labs/I-MBank_CTF_writeups/blob/main/Version_Control/Dock_and_Leak/Dock%20and%20Leak.md)

These challenges reflected real-world DevSecOps risks I’ve observed professionally.

---

## Event Execution & Live Coordination

On event day:

* Infrastructure remained stable
* Failover plan was ready but not required
* Teams competed without interruption
* Scoreboard integrity was preserved

Post-event, students shared positive feedback across LinkedIn and local cybersecurity communities.

---

## Lessons Learned

1. ***Building Resilient Platforms Matters*** -  Even for short events, reliability engineering is critical.

2. ***Improvisation Under Constraints Builds Skill*** - Designing HA without native support sharpened my architectural thinking.

3. ***Leadership Is About Enabling Others*** - Success came from:

   * Team collaboration
   * Technical mentorship
   * Clear standards
   * Shared ownership

4. ***Community Impact Matters*** - Engaging students and mentoring them reinforced why accessible security education is important.

---

## Key Takeaway

Leading this CTF strengthened my ability to:

* Architect reliable platforms
* Translate security principles into educational challenges
* Lead cross-functional technical teams
* Balance operational execution with strategic foresight

**It remains one of the most fulfilling technical leadership experiences in my career.**

---
