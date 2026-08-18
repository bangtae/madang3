# Encoding & PowerShell Rules

1. **UTF-8 Output Encoding**:
   - Whenever executing PowerShell scripts or commands, always set `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` and `$OutputEncoding = [System.Text.Encoding]::UTF8`.

2. **File Encoding Integrity**:
   - All `.ps1` and `.js` files containing Korean or non-ASCII characters MUST be saved using **UTF-8 with BOM** (`[System.Text.Encoding]::UTF8`) to prevent PowerShell 5.1 and Windows CP949/ANSI code page syntax corruption (`Unexpected token`, `MissingCatchOrFinally`, etc.).

3. **Autonomous Execution**:
   - Execute all file fixes, UTF-8 conversions, and server restarts without asking the user for intermediate approval.
