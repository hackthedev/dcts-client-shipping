using DCTS;
using Initra;
using Microsoft.Web.WebView2.WinForms;
using Renci.SshNet.Security;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO.Compression;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Transactions;
using static System.Net.Mime.MediaTypeNames;

namespace ModLoader
{
    [ClassInterface(ClassInterfaceType.AutoDual)]
    [ComVisible(true)]
    public class JSBridge
    {
        public static JSBridge instance { get; private set; }

        private TaskCompletionSource<string> waitForJsTcs;
        private TaskCompletionSource<bool> installDoneTcs;

        public JSBridge()
        {
            instance = this;
        }

        public async Task<string> WaitForJS()
        {
            waitForJsTcs = new TaskCompletionSource<string>();
            return await waitForJsTcs.Task;
        }

        public void ResolveFromJS(string value)
        {
            waitForJsTcs?.TrySetResult(value);
        }

        public string DecryptData(string method, string encKey, string iv, string tag, string ciphertext)
        {
            if(!Form1.HandleArgs(method, encKey, iv, tag, ciphertext)) return "";

            try
            {
                return Form1.cryptoHelper.DecryptEnvelope(
                    method,
                    encKey,
                    iv,
                    tag,
                    ciphertext,
                    Form1.cryptoHelper.GetPrivateKey()
                );
            
            }
            catch (Exception ex)
            {
                Debug.WriteLine("JSBridge DecryptData exception");
                Debug.WriteLine($"{method}");
                Debug.WriteLine($"{encKey}");
                Debug.WriteLine($"{iv}");
                Debug.WriteLine($"{tag}");
                Debug.WriteLine($"{ciphertext}");
                Debug.WriteLine(ex.Message);
                return "";
            }
        }

        public string DecryptDataPassword(string method, string salt, string iv, string tag, string ciphertext, string password)
        {
            if (!Form1.HandleArgs(method, salt, iv, tag, ciphertext, password)) return "";

            if (method != "password")
                throw new Exception("invalid method");

            byte[] saltBytes = Convert.FromBase64String(salt);
            using var derive = new Rfc2898DeriveBytes(password, saltBytes, 100000, HashAlgorithmName.SHA256);
            byte[] aesKey = derive.GetBytes(32);

            byte[] ivBytes = Convert.FromBase64String(iv);
            byte[] tagBytes = Convert.FromBase64String(tag);
            byte[] cipherBytes = Convert.FromBase64String(ciphertext);

            byte[] plain = new byte[cipherBytes.Length];
            using var aes = new AesGcm(aesKey);
            aes.Decrypt(ivBytes, cipherBytes, tagBytes, plain);

            return Encoding.UTF8.GetString(plain);
        }

        public string EncryptData(string data, string recipientPublicKeyOrPass = null)
        {
            if (!Form1.HandleArgs(data)) return "";

            var keys = Form1.cryptoHelper.EnsureKeyPair();
            return Form1.cryptoHelper.EncryptEnvelope(
                data,
                recipientPublicKeyOrPass ?? keys.PublicKey
            );
        }


        public string GetPublicKey()
        {
            return Form1.cryptoHelper.GetPublicKey();
        }

        public string SignJson(string json)
        {
            if (!Form1.HandleArgs(json)) return "";

            return Form1.cryptoHelper.SignJson(json);
        }

        public string SignString(string value, string key = null)
        {
            if (!Form1.HandleArgs(value)) return "";

            if (key == null)
            {
                key = Form1.cryptoHelper.GetPrivateKey();
            }

            return Form1.cryptoHelper.SignString(value, key);
        }

        public bool VerifyString(string value, string sig, string key = null)
        {
            if (!Form1.HandleArgs(value, sig)) return false;

            if (key == null)
            {
                key = Form1.cryptoHelper.GetPublicKey();
            }

            return Form1.cryptoHelper.VerifyString(value, sig, key);
        }

        public bool VerifyJson(string json, string receiptPublicKeyOrPass = null)
        {
            if (!Form1.HandleArgs(json)) return false;

            if (receiptPublicKeyOrPass != null)
            {
                return Form1.cryptoHelper.VerifyJson(json, receiptPublicKeyOrPass);
            }
            else
            {
                return Form1.cryptoHelper.VerifyJson(json, Form1.cryptoHelper.GetPublicKey());
            }
            
        }

        public string GenerateGid(string publicKey)
        {
            if (!Form1.HandleArgs(publicKey)) return "";

            if (publicKey.Length >= 120)
            {
                return Form1.cryptoHelper.EncodeToBase64(publicKey.Substring(80, 40));
            }
            else
            {
                return Form1.cryptoHelper.EncodeToBase64(publicKey.Substring(0, publicKey.Length));
            }
        }

        public void NavigateToUrl(string url)
        {
            if (!Form1.HandleArgs(url)) return;
            Form1.webView.CoreWebView2.Navigate($"http://{url}");
            Form1.formhelper.Text = $"DCTS » {url} | {Form1.GetVersion()}";
            //Form1.webView.CoreWebView2.AddHostObjectToScript("dcts", Form1.bridge);
        }

        public void NavigateHome()
        {
            Form1.formhelper.NavigateHome();
        }

        private async Task WaitUntilDone()
        {
            installDoneTcs = new TaskCompletionSource<bool>();
            await installDoneTcs.Task;
        }

        private void SignalDone()
        {
            installDoneTcs?.TrySetResult(true);
        }

        public void ResetServers()
        {
            Form1.storage.ResetServers();
        }

        public bool SaveServer(string address, string jsonData, bool isFav = false)
        {
            if (!Form1.HandleArgs(address, jsonData)) return false;
            return Form1.storage.SaveServer(address, jsonData, isFav);
        }

        public string GetServers()
        {
            return JsonSerializer.Serialize(Form1.storage.GetServers());
        }

        public string GetServer(string address)
        {
            if (!Form1.HandleArgs(address)) return "";
            return JsonSerializer.Serialize(Form1.storage.GetServer(address));
        }

        public void DeleteServer(string address)
        {
            if (!Form1.HandleArgs(address)) return;
            Form1.storage.DeleteServer(address);
        }

        public string GetJsonValue(string json, string key)
        {
            if (!Form1.HandleArgs(json, key)) return "";
            if (json == null) { return null; }

            try
            {
                using JsonDocument doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty(key, out JsonElement value))
                {
                    return value.ToString();
                }
            }
            catch (JsonException ex)
            {
                Console.WriteLine("Invalid JSON: " + ex.Message);
            }

            return null;

        }

        public string PickPath(string description)
        {
            if (!Form1.HandleArgs(description)) return "";

            Logger.Log($"Picking a path..");

            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = description;
                DialogResult result = dialog.ShowDialog();

                if (result == DialogResult.OK && !string.IsNullOrWhiteSpace(dialog.SelectedPath))
                {
                    Logger.Log($"Selected Path {dialog.SelectedPath}");
                    return dialog.SelectedPath;
                }
                return null;
            }
        }
    }
}
