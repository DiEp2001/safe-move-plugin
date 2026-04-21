SAFE MOVE PANEL - HUONG DAN CAI DAT

1. Giai nen file zip.
2. Tat Illustrator neu dang mo.
3. Double-click file install.bat
4. Mo lai Illustrator.
5. Vao Window > Extensions hoac Plugins de mo panel "Tool Illustrator".

Ghi chu:
- File install se copy extension vao:
  %APPDATA%\Adobe\CEP\extensions\com.toolillustrator.panel
- Neu may da co ban cu, installer se tu backup ban cu vao thu muc _backup.
- Installer cung bat PlayerDebugMode cho CSXS de panel CEP de load hon.

Neu gap loi quyen han:
- Thu chuot phai vao install.bat > Run as administrator
- Hoac chay install.ps1 bang PowerShell

DONG GOI FILE ZIP GUI DI:

1. Double-click file package-release.bat
2. File zip se duoc tao trong thu muc release
3. Gui file zip do cho nguoi can cai

File zip dong goi san se khong kem .git va chi chua cac file can thiet de cai dat.
Moi lan dong goi, script se tu tang patch version trong CSXS/manifest.xml.
Vi du: 1.0.0 -> 1.0.1 -> 1.0.2
