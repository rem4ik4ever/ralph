## [1.5.0](https://github.com/rem4ik4ever/ralph/compare/v1.4.0...v1.5.0) (2026-01-19)

### Features

* **init:** install ralph skill during init ([84f4e6c](https://github.com/rem4ik4ever/ralph/commit/84f4e6cbce3ebc9e8c5fe81d8a4eec26ad36d86f))
* **prd:** add getPrdInfo function for PRD status and file paths ([9dafe02](https://github.com/rem4ik4ever/ralph/commit/9dafe02d7ec5765284ad0b977728500c27c00dbd))
* **prd:** add prd delete command with confirmation ([6ee98ef](https://github.com/rem4ik4ever/ralph/commit/6ee98ef5544962cac4b7f6cd81dfd49c1d83d681))
* **prd:** add prd info command to show file locations ([aea2a98](https://github.com/rem4ik4ever/ralph/commit/aea2a98ff7ef6c9431f99798794d7373c9941e29))
* **templates:** add ralph-skill template for CLI documentation ([1bed33f](https://github.com/rem4ik4ever/ralph/commit/1bed33f045dad4674f4cbce6100bf1e8d20402f8))

### Bug Fixes

* address code review feedback ([25a99ec](https://github.com/rem4ik4ever/ralph/commit/25a99ecffa6d527a3fef5dd4103687296ef1fe0c))
* **init:** improve skill installation prompt to list all items ([12073bc](https://github.com/rem4ik4ever/ralph/commit/12073bcf1fa36c1d46e32e07ac42ce2c454cae90))

## [1.4.0](https://github.com/rem4ik4ever/ralph/compare/v1.3.1...v1.4.0) (2026-01-18)

### Features

* **init:** add post-creation steps to ralph-prd skill ([a1a8ccf](https://github.com/rem4ik4ever/ralph/commit/a1a8ccf5ca1386429fa9d336d68a8ebe8e433f6e))
* **prd:** smart existence check for prd add command ([275eb32](https://github.com/rem4ik4ever/ralph/commit/275eb320985f160bcbd0955f2c84039ca5e1b659))

## [1.3.1](https://github.com/rem4ik4ever/ralph/compare/v1.3.0...v1.3.1) (2026-01-18)

### Bug Fixes

* **init:** address code review findings ([e283ffb](https://github.com/rem4ik4ever/ralph/commit/e283ffb7ac38a0dbd5342558b37ef10359339960))
* **init:** bundle skill templates instead of reading from source ([a937e90](https://github.com/rem4ik4ever/ralph/commit/a937e9004c867048a856037e7a53c4572388478b))

## [1.3.0](https://github.com/rem4ik4ever/ralph/compare/v1.2.1...v1.3.0) (2026-01-18)

### Features

* **stream:** add auto-flush timer and event boundary flush ([0a7a125](https://github.com/rem4ik4ever/ralph/commit/0a7a1250efd94ab438d8e921d5d8a51951562b1d))
* **stream:** add signal handlers for graceful interruption ([ca78be7](https://github.com/rem4ik4ever/ralph/commit/ca78be7b3ea99d9a8359d73f5abe0d108313aaef))
* **stream:** add StreamPersister types and interfaces ([d74a102](https://github.com/rem4ik4ever/ralph/commit/d74a1029e47b3883dffbb9ea593d76e56f496b0a))
* **stream:** implement StreamPersister with buffering ([9f4e9b6](https://github.com/rem4ik4ever/ralph/commit/9f4e9b6266c8e593560bdc7491e9ed224eda13d8))
* **stream:** integrate StreamPersister with run command ([438ae08](https://github.com/rem4ik4ever/ralph/commit/438ae08ba9b2bd5fbb53d445da2bce58912dee5c))
* **stream:** mark manager-3 complete - handlers already implemented ([4056dfd](https://github.com/rem4ik4ever/ralph/commit/4056dfd412fff3202ecf4a83ea76d1b02888dfe8))

### Bug Fixes

* **stream:** address code review findings ([2ead558](https://github.com/rem4ik4ever/ralph/commit/2ead55899d428b8d2e57ca8cae7ddb3eb0dac5f0))

## [1.2.1](https://github.com/rem4ik4ever/ralph/compare/v1.2.0...v1.2.1) (2026-01-17)

### Bug Fixes

* **prd:** copyMarkdown uses write mode, add missing tests ([492ef76](https://github.com/rem4ik4ever/ralph/commit/492ef76ca6ce45af4ad50bd2ac3d3835071446a6))
* **prd:** local-first resolution for PRD creation ([ef8b6e2](https://github.com/rem4ik4ever/ralph/commit/ef8b6e271c8dc7fdaaaad35ae524c31cbaa83703))

## [1.2.0](https://github.com/rem4ik4ever/ralph/compare/v1.1.0...v1.2.0) (2026-01-17)

### Features

* **cli:** register init command ([7da3a9e](https://github.com/rem4ik4ever/ralph/commit/7da3a9e40db0c931352c49b395487a11570751f1))
* **init:** add Claude skill/command installation ([0c3bb73](https://github.com/rem4ik4ever/ralph/commit/0c3bb73dd6e270543ff6cd599b04013b960da100))
* **init:** add directory and config creation ([e1354c2](https://github.com/rem4ik4ever/ralph/commit/e1354c21f73e1abec47f782d546f42b01e8ab65c))
* **init:** add interactive prompts with @inquirer/prompts ([2fe89f6](https://github.com/rem4ik4ever/ralph/commit/2fe89f6aa03ebc7c25fbcfdb3e2478463cfa412e))
* **init:** add main init function with re-init handling ([e2d621b](https://github.com/rem4ik4ever/ralph/commit/e2d621b94b3fc7b449f26829cadc0e556426f771))
* **init:** add template read/transform functions ([deb5a48](https://github.com/rem4ik4ever/ralph/commit/deb5a48e05fcbe551a3619ee00ac81135b32a85a))
* **manager:** local-first PRD resolution ([ed126ea](https://github.com/rem4ik4ever/ralph/commit/ed126ea0b52e32b8c4715b7d45685ce8e8f79db3))
* **types:** add AgentType and InitConfig for init command ([0b42b5f](https://github.com/rem4ik4ever/ralph/commit/0b42b5f76552ce9886e2d85675d6194952f87b45))

## [1.1.0](https://github.com/rem4ik4ever/ralph/compare/v1.0.0...v1.1.0) (2026-01-17)

### Features

* **run:** add PRD_MD_PATH to agent prompt ([52c389a](https://github.com/rem4ik4ever/ralph/commit/52c389ac56a86b304708e8a66ea94be047650f04))

## 1.0.0 (2026-01-17)

### Features

* **config-1:** add semantic-release config ([9786a15](https://github.com/rem4ik4ever/ralph/commit/9786a159d2df2d95506a8f2112a105c332dddc2a))
* **deps-1:** add semantic-release dependencies ([f22d27d](https://github.com/rem4ik4ever/ralph/commit/f22d27d32a4574766ffe8b69590c9ffcbc3387ff))
* **prd:** add manager for PRD CRUD operations ([4a9c91c](https://github.com/rem4ik4ever/ralph/commit/4a9c91c7cea15050053657516617b261b771f211))
* **prd:** add prd add command ([c4942a6](https://github.com/rem4ik4ever/ralph/commit/c4942a66c03c2c9745f5b034f976f328be6f5ded))
* **prd:** add prd list command ([9996aff](https://github.com/rem4ik4ever/ralph/commit/9996afff36f0c1a48cdbf9d18b89682023d8d3c7))
* **prd:** add PRD type definitions ([a9b1051](https://github.com/rem4ik4ever/ralph/commit/a9b105160e92c751704c9c954d517afbb157ea50))
* **run:** rewrite run command for PRD-only mode ([96fc701](https://github.com/rem4ik4ever/ralph/commit/96fc701a2b592fd943c9c448f9f5f567e1ebb4da))
* **templates:** add complete-next-task template ([94d804f](https://github.com/rem4ik4ever/ralph/commit/94d804f7222a29d7559f38cabe43b6e8001ba39b))
* **templates:** add prd-md-to-json template ([4afd274](https://github.com/rem4ik4ever/ralph/commit/4afd274094ab60812e8a5f06b58c1e24a405616a))
* **templates:** add template loading system ([032c5ea](https://github.com/rem4ik4ever/ralph/commit/032c5eaca84b1f9cd45fd10ab87729247ff49faf))

### Bug Fixes

* release workflow ([dc65eab](https://github.com/rem4ik4ever/ralph/commit/dc65eabec6bb6980ff94cca51464275ff7c5951f))
* **tests:** update run.test.ts and cli.test.ts for new CLI signature ([56a23c3](https://github.com/rem4ik4ever/ralph/commit/56a23c3e4ae89135f6e347b106bdab8cc221125b))
