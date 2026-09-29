This is an astro project that using `bun` as runtime & package management.

content management: agent update -> md/mdx files in contents; md/mdx files gets rendered by astro project.
Only user will turn on the dev server. by default the dev server will be turned on by the user, if you detected it's not on then ask the user to turn it on.

Read package.json for executing dev/build/lint/format/type-check scripts.
Use ripgrep instead of grep.
Changes must pass pre commit checks.

If user requests is incomplete or vague describe or conflict or needs clarification, clarify things with user before you proceed.
For any user given task, breakdown each indivdual things and perform deep research on each one of them.
For all read-only tasks, always dispatch/delgate them to multiple subagents with specific insturctions. Read-only task such as research, repo exploration, validation, fact-checking, etc.
Read-only tasks also include such task where you found a minor issue and and fixed it and instead of doing a complete file read, delgate an subagent to verify the changes and respond to you with its observations. For example, you have implement a fix specific by user, instead of running the build script & reading the static files, delgate it to a subagent.
All the above instructions should be applied to subagents too.
