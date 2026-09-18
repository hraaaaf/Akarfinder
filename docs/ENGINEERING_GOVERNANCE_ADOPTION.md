# Engineering governance adoption

Akarfinder explicitly adopts the central engineering-governance baseline:

- version: `1.0.0`
- exact source commit: `4c0ed295cc095fc5e7f9d0ddde3b1af95ac8dba9`
- adoption manifest: `.governance/adoption.json`

The central doctrine is the minimum engineering standard for this repository. No pre-existing repository-local governance entrypoint was identified during the adoption inspection.

This adoption does not authorize deployment, production configuration changes, database/schema/data mutation, merge, or irreversible action. Existing product behavior and architecture are unchanged.

Any future project-specific governance may tighten the central baseline. Weakening it requires explicit human approval and a recorded exception. Future doctrine upgrades require a new immutable version/SHA pin; moving references such as `main` or `latest` are invalid.
