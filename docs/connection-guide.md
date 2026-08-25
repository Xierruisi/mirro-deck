# MirroDeck device connection guide

**English** | [简体中文](connection-guide.zh-CN.md)

MirroDeck can connect to devices over USB or Wi-Fi, as well as to Android emulators. After a connection is established, the device appears in the list on the left side of the app. You can start mirroring when its status is **Available**.

> MirroDeck bundles scrcpy and adb. You do not normally need to install Android Platform Tools when using an installer.

## Before connecting

1. On the Android device, open **Settings → About phone**.
2. Tap **Build number** or **Software version** about seven times, until the system confirms that developer mode is enabled.
3. Return to Settings, open **Developer options**, and enable **USB debugging**.

Menu names vary between manufacturers. Search the device settings for “Build number,” “Developer options,” or “USB debugging” if necessary.

## Method 1: connect over USB

USB is the most reliable connection method. For first-time setup, use USB to confirm that the device can be authorized correctly.

1. Connect the computer and Android device with a USB cable that supports data transfer.
2. Unlock the device and look for an **Allow USB debugging** dialog.
3. Verify the RSA fingerprint. On a computer you trust, you may select **Always allow from this computer**, then tap **Allow**.
4. Open MirroDeck. It scans for devices automatically; you do not need to select **Add device**.
5. Wait for the device to appear in the left sidebar with the status **Available · USB**.
6. Select the device, adjust video quality, control, and recording options as needed, then select **Start mirroring** in the upper-right corner.

The mirrored display opens in a separate native scrcpy window. Select **Stop mirroring** in MirroDeck or close the scrcpy window to end the session.

## Method 2: connect over Wi-Fi (Android 11 and later)

The computer and Android device must be on the same local network. The first connection requires wireless pairing. MirroDeck keeps secure ADB mDNS discovery active, so a paired device normally reconnects automatically even when its wireless debugging port changes.

### Step 1: pair wirelessly

1. Open **Developer options** on the device and enable **Wireless debugging**.
2. Open **Wireless debugging**, then select **Pair device with pairing code**.
3. In the lower-left corner of MirroDeck, select **Add device → Wi-Fi connection**.
4. Enter the **IP address and port** from the device's pairing dialog, for example `192.168.1.10:37099`.
5. Enter the six-digit Wi-Fi pairing code shown on the device, then select **Start pairing**.
6. After pairing succeeds, MirroDeck waits for ADB to discover and connect the device through mDNS. Once **Available · Wi-Fi** appears in the sidebar, select **Start mirroring**.

Pairing codes and pairing ports are usually valid for only a short time. If pairing fails, reopen **Pair device with pairing code** on the device and use the newly generated details.

### Manual connection fallback

If the local network blocks mDNS or the device does not appear automatically:

1. Return to the main **Wireless debugging** page on the device and find the **IP address and port** shown near the top.
2. Use the connection form MirroDeck leaves open after an unsuccessful automatic discovery. If the device was paired earlier, select **Add device → Wi-Fi connection → Already paired? Continue to connect**.
3. Enter the address from the main Wireless debugging page, then select **Connect device**.
4. Wait for the device to appear in the left sidebar with the status **Available · Wi-Fi**.
5. Select the device, then select **Start mirroring**.

> The pairing and connection addresses usually use different ports. For pairing, use the address in the **Pair device with pairing code** dialog. For connecting, use the address on the main **Wireless debugging** page.

### Reconnect a paired device

If the device and computer were paired previously, you normally do not need another pairing code:

1. Make sure the computer and device are still on the same local network, and enable **Wireless debugging** on the device.
2. Open MirroDeck. Its persistent ADB mDNS discovery reconnects the device automatically.
3. Once the device appears as **Available · Wi-Fi**, select it and start mirroring.

The port can change after the device reconnects to the network or Wireless debugging is turned off and on; mDNS resolves the current port automatically. If discovery fails, use the manual connection fallback with the address currently shown on the device.

### Scan the local network

Click the refresh button in the upper-right corner of the device list. MirroDeck refreshes current ADB devices, then scans ADB mDNS services and the legacy `5555` port on the current local network. Candidates appear as **Discovered · Wi-Fi**; select one and choose **Connect device** to try connecting.

The scan probes only the `/24` IPv4 subnet of the current network interface by default and does not complete wireless debugging pairing automatically. First-time pairing still requires the six-digit code shown by the device. Guest, enterprise, or client-isolated networks may prevent device discovery.

## Method 3: connect an Android emulator

1. Start Android Studio Emulator or another local emulator that is accessible through adb.
2. Open MirroDeck, or select the refresh button in the upper-right corner of the device list.
3. Wait for a device with a name such as `emulator-5554` to appear with the status **Available · Emulator**.
4. Select the emulator, then select **Start mirroring**.

## Mirror multiple devices at once

MirroDeck can run mirror sessions for multiple authorized devices at the same time:

1. Select the first device with the **Available** status and choose **Start mirroring**.
2. Wait for its independent scrcpy window to open, then select another device in the sidebar.
3. Choose **Start mirroring** for the second device.
4. The **LIVE** marker in the device list indicates an active mirror session.

Each device has its own scrcpy process and window. Resolution, audio, control, and window options are currently global defaults: changing them does not alter already-running sessions, but affects devices started afterward. One-click start-all and batch stop are not supported yet.

## Connection statuses

| Status | Meaning | What to do |
|---|---|---|
| Available | The device is connected and authorized | Select **Start mirroring** |
| Authorization required | The computer has not been authorized for USB debugging | Unlock the device and accept the **Allow USB debugging** dialog |
| Offline | adb can see the device but cannot communicate with it | Check the cable or network, then select **Restart ADB** in MirroDeck |

## Troubleshooting

### The device is not found after connecting over USB

- Confirm that the USB cable supports data transfer and is not charge-only.
- Unlock the device, switch its USB mode to **File transfer**, and try again.
- Confirm that both **Developer options** and **USB debugging** are enabled.
- Select the refresh button in the upper-right corner of the device list.
- On Windows, you may need the ADB USB driver supplied by the device manufacturer.
- On Linux, you may need Android udev rules and membership in the `plugdev` group.

### The device remains in “Authorization required”

1. Keep the device unlocked, then disconnect and reconnect the USB cable.
2. In **Developer options**, select **Revoke USB debugging authorizations**.
3. Reconnect and accept the RSA fingerprint authorization dialog again.

### Pairing succeeds, but the device does not appear

Keep **Wireless debugging** enabled and confirm that the computer and device are on the same local network. Guest, corporate, campus, and public networks may block mDNS or isolate clients. Select **Restart ADB** and refresh once; if the device still does not appear, enter the connection address from the main Wireless debugging page in the manual connection form.

### Wireless connection fails

- Confirm that the computer and device are on the same local network and that a guest network or router is not isolating clients.
- Confirm that you are using the connection port on the main Wireless debugging page, not the port in the pairing dialog.
- Turn **Wireless debugging** off and on, then connect with the newly displayed address.
- If the device is **Offline**, select **Restart ADB** in the MirroDeck prompt and try again.
- Corporate, campus, and public Wi-Fi networks may block communication between devices. Use USB instead when that happens.

### The “Start mirroring” button is disabled

Mirroring can start only when the device status is **Available**. Resolve an **Authorization required** or **Offline** status first. When running the project from source, you must also run `npm run tools:prepare` to prepare the bundled toolchain.

## Security recommendations

- Enable Wireless debugging only on trusted local networks. Never expose its port to the public internet.
- Turn off **Wireless debugging** when you finish using it.
- Do not select **Always allow from this computer** on a public or untrusted computer. Revoke USB debugging authorizations after use when appropriate.
