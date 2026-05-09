# VERIFICATION PROTOCOL
After generating code, do not just claim success. Run through this list:

1. **Compilation/Lint Check:** Can the file be parsed without errors?
2. **Scope Check:** Did I accidentally touch files outside my designated scope?
3. **Regression Check:** Did I break anything adjacent?
4. **Test Coverage:** Have I written/run tests for both Valid and Invalid inputs?

[ ] All checks passed. Ready for merge.