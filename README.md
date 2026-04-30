# EcoTrial

Before releasing, test your package against real downstream projects.

EcoTrial is a ShipProve release confidence tool for package, framework, SDK, plugin, and CLI maintainers. It temporarily injects a candidate package release into configured downstream repositories, then runs their install, build, typecheck, and test commands to catch compatibility issues before publication.

This repository is under active MVP development. The CLI is not published yet, and the GitHub Action is not released yet.

## Why EcoTrial?

Your own unit tests can pass while real users still hit broken builds, type errors, peer dependency conflicts, or plugin API regressions. EcoTrial focuses on small, reproducible downstream compatibility checks that can run in ordinary CI before a release.

EcoTrial is intentionally different from adjacent ShipProve tools:

- SemVerdict evaluates public surface changes and SemVer risk.
- PackTrial validates package artifacts in generated synthetic consumer projects.
- EcoTrial validates candidate releases in real downstream repositories.

## Planned MVP Scope

The MVP targets Node.js and TypeScript package ecosystems.

Planned capabilities:

- Candidate package input from a local tarball or `npm pack`.
- Downstream project definitions in `ecotrial.yml`.
- Shallow clone of configured downstream repositories.
- Candidate injection through package.json rewrite, npm overrides, or pnpm overrides.
- Install and configured command execution with timeouts.
- Failure classification for install, typecheck, build, test, timeout, override, and unknown failures.
- Terminal, JSON, Markdown, and GitHub Actions summary reports.
- A GitHub Action for release pull requests and manual workflows.

Out of initial scope:

- Large-scale distributed ecosystem testing.
- Automatic downstream project discovery.
- Secret-backed private downstream projects.
- Docker sandboxing.
- Flaky test detection.
- Automatic patch or pull request generation.

## Configuration Preview

```yaml
candidate:
  packageName: "@scope/pkg"
  source: "auto-pack"
  packageRoot: "."

execution:
  concurrency: 2
  timeoutMinutes: 15
  keepWorkdir: false

projects:
  - name: "example-app"
    repo: "https://github.com/example/example-app.git"
    ref: "main"
    packageManager: "pnpm"
    override:
      strategy: "package-json-rewrite"
    install: "pnpm install --frozen-lockfile=false"
    commands:
      - name: "build"
        run: "pnpm build"
      - name: "test"
        run: "pnpm test"
```

## Planned CLI

```bash
ecotrial init
ecotrial doctor
ecotrial list
ecotrial run
ecotrial report
ecotrial reproduce
```

`init`, `doctor`, `list`, and `run` are implemented for the dogfood MVP. `report` and `reproduce` are planned and may change before the first release.

## Security

EcoTrial executes commands from downstream repositories. Only run it against projects you trust, or use isolated runners.

Recommended CI defaults:

- Use least-privilege GitHub Actions permissions, usually `contents: read`.
- Do not pass secrets to workflows that install or execute downstream project code.
- Avoid `pull_request_target` for workflows that run package scripts, install scripts, downstream tests, or other attacker-controlled code.
- Use `actions/checkout` with persisted credentials disabled when running untrusted code.
- Keep command execution bounded by timeouts and captured output limits.

EcoTrial is not a sandbox. It uses a sanitized child-process environment and best-effort log redaction, but downstream install scripts and test commands are still code execution. `execution.installScripts` defaults to `true` for real consumer fidelity. Set it to `false` for security-sensitive runs where lifecycle scripts should be disabled.

## Privacy

EcoTrial does not collect telemetry by default. It should only access the network when required by configured operations, such as packing or resolving a candidate package, installing dependencies, or cloning configured downstream repositories.

## Contributing

EcoTrial is not ready for feature contributions yet. Early contributions should focus on clarifying requirements, safety constraints, configuration design, and MVP implementation issues.

When contributing later, please:

- Keep public CLI options, config keys, report keys, diagnostic codes, and GitHub Action inputs stable once introduced.
- Add or update tests for behavior changes.
- Update `CHANGELOG.md` for user-visible changes.
- Document safety and privacy implications for execution-related changes.

## License

Apache-2.0. See [LICENSE](LICENSE).
