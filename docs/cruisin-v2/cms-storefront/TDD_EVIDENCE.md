# Tdd Evidence

Updated 2026-11-07. Status: **VERIFIED LOCALLY**.

Three new real Mongo tests first failed behaviorally, then passed: draft visibility, empty snapshot isolation and invalid preview/time-travel access. Logs: /tmp/cruisin-cms-publication-red.log and /tmp/cruisin-cms-publication-green.log. Browser failure exposed renderer rejecting draft sections; authorized preview now explicitly enables draft rendering.
