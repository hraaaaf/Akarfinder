# ODM Canary 25 % — Production rebuild trigger

This document records the deliberate Production rebuild requested on 2026-08-04.

Purpose:

- force Vercel Git integration to build the current `main` source;
- combine the committed ODM technical ceiling of 25% with the Production environment value already set to 25;
- avoid reusing an older deployment artifact whose code ceiling was still 10%;
- preserve fail-closed behavior until the fresh deployment is Ready;
- run the read-only 25% certification only after deterministic lane probes succeed.

This file has no runtime, ranking, database, policy, schema, or UI effect.
