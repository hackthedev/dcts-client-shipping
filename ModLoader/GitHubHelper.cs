
using ModLoader;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Policy;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace Initra
{
    public class GitHubHelper
    {
        public static GitHubHelper instance { get; private set; }


        public GitHubHelper()
        {
            instance = this;
        }

        public async Task<JsonNode?> GetAppsJson()
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("User-Agent", "InitraApp");

            var response = await client.GetAsync($"https://api.github.com/repos/hackthedev/initra-shipping/contents/apps?ref={Form1.branch}");
            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            return JsonNode.Parse(json);
        }

        public async Task<JsonNode?> GetAppInfo(string appName)
        {
            try
            {
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "InitraApp");

                var response = await client.GetAsync($"https://raw.githubusercontent.com/hackthedev/initra-shipping/refs/heads/{Form1.branch}/apps/{appName}/app.json");
                response.EnsureSuccessStatusCode();

                string json = await response.Content.ReadAsStringAsync();
                return JsonNode.Parse(json);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Unable to get App Info about {appName}:\n\n" + ex.Message, null, MessageBoxButtons.OK, MessageBoxIcon.Error);
                return null;
            }
        }

        public string GetAppInstallScriptLink(string appName)
        {
            return $"https://raw.githubusercontent.com/hackthedev/initra-shipping/refs/heads/{Form1.branch}/apps/{appName}/install.sh";
        }

        public async Task<JsonNode?> GetBranches(string repo)
        {
            try
            {
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "InitraApp");

                var response = await client.GetAsync($"https://api.github.com/repos/{repo}/branches");
                response.EnsureSuccessStatusCode();

                string json = await response.Content.ReadAsStringAsync();
                return JsonNode.Parse(json);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Unable to getbranches of {repo}:\n\n" + ex.Message, null, MessageBoxButtons.OK, MessageBoxIcon.Error);
                return null;
            }
        }

    }
}
