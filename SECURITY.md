# Security Policy

## Project scope

Campaign Pulse is a static, local-first portfolio prototype. It has no backend, database, authentication, OAuth, live CRM/ESP API, persistent upload service, or required secrets.

Bundled data is synthetic. Local CSV files are read in the browser and retained only for the current session. Target edits are stored in browser `localStorage`.

## Reporting

If you find a security issue in the repository or public demo, report it privately through the repository owner's GitHub profile rather than opening a public issue with exploit details or sensitive data.

Do not submit real customer data, credentials, tokens, or private exports when reporting an issue.

## Dependency advisories

Review advisories with:

```bash
npm audit --omit=dev
```

Do not use forced dependency upgrades as a release-cleanup shortcut. Framework advisories should be handled in a dedicated upgrade branch with full test, lint, typecheck, build, and browser regression verification.
