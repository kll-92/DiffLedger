# Security Policy

## Threat model

DiffLedger executes Evidence Checks from `.diffledger.json` with the current
user's permissions. Treat that Policy exactly like a script: only run checks
from a repository and revision you trust.

The v0.1 runner does not provide filesystem, process, network, or secret
isolation. It avoids a command shell, enforces timeouts, and bounds captured
output, but those controls do not make untrusted commands safe.

A Receipt Digest detects corruption or edits where the digest was not also
recomputed. Anyone who can replace the Receipt can recompute its unkeyed digest.
Use `verify --digest <value>` with a value obtained from an independent trusted
channel to detect that substitution. Neither mode authenticates who ran
DiffLedger or whether the execution environment was trustworthy.

## Supported versions

Security fixes are applied to the latest minor release while the project is
pre-1.0.

## Reporting a vulnerability

Please use GitHub private vulnerability reporting rather than a public Issue.
Include a minimal reproduction, affected version, and expected impact. Do not
include production secrets or personal data.
