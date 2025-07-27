# Implementation Workflow Instructions

## Overview
This document provides reusable instructions for implementing each phase and subtask of the multiplayer implementation plan with proper feedback loop management.

## General Workflow

### Before Starting Any Phase
1. **Review the current phase document** in `/docs/phase{N}/`
2. **Check the master plan** in `/docs/multiplayer-implementation-plan.md` for context
3. **Understand the objectives and success criteria** before beginning implementation

### During Implementation
1. **Work on the next available unchecked task** from the master plan
2. **Follow the detailed specifications** in the corresponding phase document
3. **Test implementations thoroughly** before marking tasks complete
4. **Document any deviations or insights** discovered during implementation

### After Completing Each Task
1. **Mark the corresponding checkbox as complete** `- [x]` in `/docs/multiplayer-implementation-plan.md`
2. **Run unit tests** for new code by using the `unit-test-engineer` agent to create comprehensive test coverage
3. **Update the master document** with any important insights, architectural changes, or lessons learned
4. **If applicable, update the phase document** with implementation notes or clarifications
5. **Proceed to the next unchecked task** in the same phase

### After Completing Each Phase
1. **Verify all checkboxes are marked complete** for that phase
2. **Update the master document** with a phase completion summary
3. **Add any architectural insights** that might affect future phases
4. **Move to the next phase** following the completion instructions in the phase document

## Specific Commands for Implementation

### Quick Status Check
```bash
# See current progress on master plan
grep -n "\- \[" docs/multiplayer-implementation-plan.md

# Count completed vs total tasks
grep -c "\- \[x\]" docs/multiplayer-implementation-plan.md
grep -c "\- \[" docs/multiplayer-implementation-plan.md
```

### Working on a Task
1. **Identify the current task**: Find the next `- [ ]` unchecked item
2. **Read the phase document**: Open `/docs/phase{N}/{task}.md` for detailed specifications
3. **Implement the feature**: Follow the technical specifications and deliverables
4. **Test the implementation**: Ensure success criteria are met
5. **Create unit tests**: Use the `unit-test-engineer` agent to generate comprehensive tests for new code
6. **Update progress**: Mark checkbox complete and update docs

### Updating Progress
```bash
# Example: Mark task 1.2 first subtask as complete
# Change: - [ ] Replace `MyDurableObject` with `GameRoomObject`
# To:     - [x] Replace `MyDurableObject` with `GameRoomObject`
```

## Master Document Update Guidelines

When updating `/docs/multiplayer-implementation-plan.md`, add insights in these areas:

### Phase Completion Notes
Add a section like:
```markdown
## Phase {N} Completion Notes
- **Completed**: {Date}
- **Key Insights**: {Architectural discoveries, performance findings, etc.}
- **Deviations**: {Any changes from original plan}
- **Next Phase Considerations**: {What to watch out for in next phase}
```

### Architecture Changes
If implementation reveals need for architectural changes:
```markdown
## Architecture Updates
- **Change**: {What changed}
- **Reason**: {Why the change was necessary}
- **Impact**: {How this affects other phases}
```

## Example Implementation Session

```bash
# 1. Check current status
grep -A5 -B5 "\- \[ \]" docs/multiplayer-implementation-plan.md | head -20

# 2. Identify next task: "Research Cloudflare Durable Objects best practices"

# 3. Read phase document
open docs/phase1/1.1-research-best-practices.md

# 4. Implement the research task
# ... do the research work ...

# 5. Update master plan (mark checkbox complete)
# Edit docs/multiplayer-implementation-plan.md:
# Change: - [ ] Research Cloudflare Durable Objects best practices for real-time games
# To:     - [x] Research Cloudflare Durable Objects best practices for real-time games

# 6. Document findings in master plan
# Add section with research insights

# 7. Move to next task
grep -A3 -B3 "\- \[ \]" docs/multiplayer-implementation-plan.md | head -10
```

## Quality Assurance

Before marking any task complete:
- [ ] Implementation meets all success criteria in the phase document
- [ ] Code follows existing project patterns and conventions
- [ ] Unit tests created using `unit-test-engineer` agent for new code
- [ ] All tests pass (existing and new)
- [ ] Documentation is updated
- [ ] No breaking changes to existing functionality

## Troubleshooting

### If a Task is Blocked
1. **Document the blocker** in the master plan near the task
2. **Skip to next available task** that doesn't depend on the blocked one
3. **Return to blocked task** once blocker is resolved

### If Requirements Change
1. **Update the relevant phase document** first
2. **Update the master plan** checkbox text if needed
3. **Document the change reason** in master plan
4. **Proceed with updated requirements**

## Final Notes

This workflow ensures:
- ✅ **Consistent progress tracking** with checkbox system
- ✅ **Proper documentation** of insights and changes  
- ✅ **Clear next steps** at all times
- ✅ **Feedback loop** between implementation and planning
- ✅ **Quality assurance** before marking tasks complete

**Remember**: The goal is steady, documented progress with proper feedback loops, not speed. Take time to document insights that will help future phases.