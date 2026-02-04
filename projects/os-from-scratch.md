---
title: OS from Scratch
description: Building a hobby operating system in Rust.
img: https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGEBwtDicAIhDV3iJIsNPD8K4QuWvymSrYt-j_k-KMBQTYXTcEOzJhBRM&s
category: engineering
---

The goal of this project was to understand how a kernel manages memory and scheduling by writing one from the ground up.

### Implementation Details
1. **Bootloader:** Custom BIOS bootloader.
2. **Memory Management:** Implemented a buddy allocator.
3. **Task Switching:** Basic preemptive multitasking.