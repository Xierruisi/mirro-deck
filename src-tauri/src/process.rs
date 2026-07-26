use std::process::Command;

pub fn hide_console(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;

        // CREATE_NO_WINDOW keeps adb and scrcpy from opening a console window.
        command.creation_flags(0x0800_0000);
    }

    #[cfg(not(windows))]
    let _ = command;
}
