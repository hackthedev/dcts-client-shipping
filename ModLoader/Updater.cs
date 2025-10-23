using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace DCTS
{
    public static class Updater
    {
        public static async Task CheckAsync(string repo, string currentVersion)
        {
            using var client = new WebClient();

            try
            {
                string remoteUrl = $"https://github.com/{repo}/releases/latest/download/version.txt";
                string remoteVersion = await client.DownloadStringTaskAsync(remoteUrl);

                remoteVersion = remoteVersion.Trim();

                if (remoteVersion == currentVersion)
                    return;

                // return if we skipped this version
                if (DCTS.Properties.Settings.Default.skippedVersion.Length > 0)
                {
                    if (remoteVersion == DCTS.Properties.Settings.Default.skippedVersion)
                    {
                        return;
                    }
                }

                DialogResult result = MessageBox.Show(
                    $"A new update is available ({remoteVersion}) \nDo you want to download it?",
                    "DCTS",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Information
                );

                if (result != DialogResult.Yes)
                {
                    DialogResult skipVersion = MessageBox.Show(
                       $"Do you want to skip this version? ({remoteVersion})",
                       "DCTS",
                       MessageBoxButtons.YesNo,
                       MessageBoxIcon.Information
                    );

                    // option to skip version
                    if (skipVersion == DialogResult.Yes)
                    {
                        DCTS.Properties.Settings.Default.skippedVersion = remoteVersion;
                        DCTS.Properties.Settings.Default.Save();
                        DCTS.Properties.Settings.Default.Reload();
                    }

                    return;
                }

                string zipPath = Path.Combine(Application.StartupPath, "update.zip");
                string downloadUrl = $"https://github.com/{repo}/releases/latest/download/update.zip";

                await client.DownloadFileTaskAsync(downloadUrl, zipPath);

                if (File.Exists(zipPath))
                {
                    Process.Start(zipPath);

                    Application.Exit();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Unable to update client:\n{ex.Message}", "DCTS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
