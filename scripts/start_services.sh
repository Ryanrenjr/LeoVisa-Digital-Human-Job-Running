#!/bin/bash
# LeoVisa startup script — uses systemd for reliable service management.

systemctl --user start leovisa-backend.service leovisa-frontend.service ollama.service 2>/dev/null

echo '[leovisa] services started'
systemctl --user is-active leovisa-backend.service leovisa-frontend.service
