#!/bin/bash
# Коміт і пуш курсу + синхронізація копії для превью
set -e
cd /home/claude/start-in-pm
node --check assets/course.js
cp -r index.html program.html product.html zoshyt.html assets lessons /home/claude/pm-course/
git add -A
git -c user.name="Dmytro" -c user.email="dimalucenko40@gmail.com" commit -qm "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EQGek8GycwdrRA8uSfmb4Y"
git push -q origin main 2>&1 | grep -iv 'moved\|location\|Start-in-PM.git' || true
git log --oneline | head -1
