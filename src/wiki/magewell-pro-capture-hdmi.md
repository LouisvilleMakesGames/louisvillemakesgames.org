# Magewell Pro Capture HDMI

Linux quick start for the official Magewell Pro Capture HDMI card driver.

<div class="wiki-file-buttons">
	<a class="wiki-file-button" href="/wiki/files/magewell-pro-capture-hdmi/ProCaptureForLinux_1.3.4429.tar.gz" target="_blank" rel="noopener noreferrer">
		<i class="fa-brands fa-linux" aria-hidden="true"></i>
		<span>Download Linux Driver (.tar.gz)</span>
	</a>
</div>

## Quick start

Install:

```bash
tar -xzf ~/Downloads/ProCaptureForLinux_1.3.4429.tar.gz -C ~/Downloads
cd ~/Downloads/ProCaptureForLinux_1.3.4429
./install.sh
```

Success output should include:

```text
Install Successfully!
```

Device info:

```bash
mwcap-info
```

Set device properties:

```bash
mwcap-control
```

Open OBS and add a Video Capture Device source to confirm the card is available.

Manual PDF: [Pro Capture user manual](/wiki/files/magewell-pro-capture-hdmi/Pro-Capture-user-manual_en_US.pdf)
