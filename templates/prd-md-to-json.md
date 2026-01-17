# PRD to JSON Conversion

Convert the PRD markdown file to structured JSON.

## Input

PRD markdown file: `$PRD_PATH`

## Output

Write JSON to: `$OUTPUT_PATH`

Output ONLY the JSON file. No explanations, no markdown, no code blocks.

## JSON Schema

```json
{
  "prdName": "string - kebab-case identifier",
  "tasks": [
    {
      "id": "string - category-number (e.g., types-1)",
      "category": "string - logical grouping",
      "description": "string - what this task accomplishes",
      "steps": ["string - specific verification step"],
      "passes": false
    }
  ],
  "context": {
    "patterns": ["string - codebase patterns to follow"],
    "keyFiles": ["string - important file paths"],
    "nonGoals": ["string - explicitly out of scope"]
  }
}
```

## Conversion Rules

1. **Task Extraction**
   - Each major feature/component = separate task
   - Tasks must be independently completable
   - Order by dependency: foundations first

2. **Task IDs**
   - Format: `<category>-<number>`
   - Categories: types, templates, manager, command, cli, testing, cleanup
   - Number sequentially within category

3. **Steps**
   - Concrete, verifiable outcomes
   - Should be testable/checkable
   - Include "tests pass" where applicable

4. **passes Field**
   - Always set to `false` for new tasks
   - Agent marks `true` after completing task

5. **Context**
   - Extract patterns from PRD intro/overview
   - List key files mentioned in PRD
   - Extract non-goals/out-of-scope items
