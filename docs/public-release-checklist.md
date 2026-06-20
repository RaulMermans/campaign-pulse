# Campaign Pulse Public Release Checklist

Use this checklist before making the repository or portfolio entry public.

## Repository and source

- [ ] Confirm `git status --short` contains only intentional release changes.
- [ ] Confirm no secrets, `.env` files, customer data, private URLs, or local notes are tracked.
- [ ] Confirm `package-lock.json` is retained.
- [ ] Confirm no `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `node_modules/`, `.next/`, `.pnpm-store/`, logs, temporary files, ZIPs, or PDFs are tracked.
- [ ] Run the CI source-clean guard locally or inspect the equivalent `git ls-files` result.
- [ ] Review the final diff and run `git diff --check`.

## Clean install and verification

- [ ] `npm ci`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run verify`
- [ ] Confirm GitHub Actions passes on the final commit.

## Vercel

- [ ] Confirm the framework preset is Next.js.
- [ ] Confirm the install command is `npm ci`.
- [ ] Confirm the build command is `npm run build`.
- [ ] Leave the output directory at the Vercel default.
- [ ] Confirm `main` is the production branch.
- [ ] Confirm no environment variables are required.
- [ ] Confirm the preview deployment passes a workspace smoke test.
- [ ] Confirm the production deployment opens at the README demo link.

## Screenshot capture

- [ ] Overview mission-control: business health, target state, pressure risk, and best next move visible.
- [ ] Data import readiness and upload: local-only note, file state, row counts, and activation path visible.
- [ ] Editable column mapping: inferred/manual confidence, required status, and diagnostics visible.
- [ ] Audience all segments: the complete segment landscape is readable.
- [ ] Audience selected detail: movement, target status, trends, campaign fit, and recommendation visible.
- [ ] Calendar month: cadence, pressure treatment, compact sends, and overflow state visible.
- [ ] Newsletters ranking table: rank, revenue, engagement, target exception, risk, and open affordance visible.
- [ ] Campaign comparison: contribution, best/weakest send, target state, pressure, and recommendation visible.
- [ ] Report memo: executive summary, evidence, targets, risks, and operating plan visible.
- [ ] Export actions: representative Data and workspace export controls visible.
- [ ] Disable browser print headers and footers before capturing the report print view.

## Public copy and audit note

- [ ] Confirm the README pitch, feature list, architecture, setup, verification, Vercel settings, limitations, and roadmap are current.
- [ ] Confirm the live demo link resolves successfully.
- [ ] Confirm demo data and `.test` identities are clearly labeled as synthetic.
- [ ] Confirm the repository states that there is no backend, database, auth, API integration, OAuth, or AI service.
- [ ] Record the current `npm audit --omit=dev` result for maintainers.
- [ ] Do not run `npm audit fix --force`; handle advisories in a dedicated Next.js upgrade branch with regression testing.

## Final publication

- [ ] Confirm repository description, topics, social preview, and homepage/demo URL are set on GitHub.
- [ ] Confirm repository visibility is Public.
- [ ] Confirm the default branch is `main` and branch protection/CI expectations are appropriate.
- [ ] Open the repository and demo in a signed-out browser window.
- [ ] Confirm README links and relative documentation links work.

Reference workflow collection: [awesome-vibe-coding](https://github.com/filipecalegario/awesome-vibe-coding).
