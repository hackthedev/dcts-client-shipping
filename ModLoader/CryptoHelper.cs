using ModLoader;
using System;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DCTS
{
    public class CryptoHelper
    {
        public static CryptoHelper instance { get; private set; }
        public CryptoHelper()
        {
            instance = this;
        }

        /* for curious people:
          RSA-2048 (OAEP-SHA1) encrypts the key
          AES-256-GCM encrypts the message
          PBKDF2-SHA256 makes a key from a password
          RSA-SHA256-PKCS1 signs and verifies data
         */

        private readonly string KeyFilePath = Path.Combine(Application.StartupPath, "privatekey.json");

        public (string PrivateKey, string PublicKey) EnsureKeyPair()
        {
            if (File.Exists(KeyFilePath))
            {
                var json = File.ReadAllText(KeyFilePath);
                var data = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
                if (data != null && data.ContainsKey("PrivateKey"))
                {
                    using var rsa = RSA.Create();
                    rsa.ImportFromPem(data["PrivateKey"].AsSpan());
                    string pub = ExportPublicKey(rsa);
                    return (data["PrivateKey"], pub);
                }
            }

            using var newRsa = RSA.Create(2048);
            string privatePem = ExportPrivateKey(newRsa);
            string publicPem = ExportPublicKey(newRsa);
            File.WriteAllText(KeyFilePath, JsonSerializer.Serialize(new { PrivateKey = privatePem }, new JsonSerializerOptions { WriteIndented = true }));
            return (privatePem, publicPem);
        }

        public string EncodeBase64(string value)
        {
            var valueBytes = Encoding.UTF8.GetBytes(value);
            return Convert.ToBase64String(valueBytes);
        }

        public string DecodeBase64(string value)
        {
            var valueBytes = System.Convert.FromBase64String(value);
            return Encoding.UTF8.GetString(valueBytes);
        }

        public string EncodeURIComponent(string value)
        {
            return Uri.EscapeDataString(value);
        }

        public string DecodeURIComponent(string value)
        {
            return Uri.UnescapeDataString(value);
        }

        public string EncodeToBase64(string value)
        {
            return EncodeBase64(EncodeURIComponent(value));
        }

        public string DecodeFromBase64(string value)
        {
            return DecodeURIComponent(DecodeBase64(value));
        }

        public string GetPrivateKey()
        {
            var pair = EnsureKeyPair();
            return pair.PrivateKey;
        }

        public string GetPublicKey()
        {
            var pair = EnsureKeyPair();
            return pair.PublicKey;
        }

        private static string ExportPrivateKey(RSA rsa)
        {
            var priv = rsa.ExportPkcs8PrivateKey();
            return PemEncode("PRIVATE KEY", priv);
        }

        private static string ExportPublicKey(RSA rsa)
        {
            var pub = rsa.ExportSubjectPublicKeyInfo();
            return PemEncode("PUBLIC KEY", pub);
        }

        private static string PemEncode(string label, byte[] data)
        {
            string base64 = Convert.ToBase64String(data, Base64FormattingOptions.InsertLineBreaks);
            return $"-----BEGIN {label}-----\n{base64}\n-----END {label}-----";
        }

        public string EncryptEnvelope(string plaintext, string recipientPemOrPassword)
        {
            byte[] plainBytes = Encoding.UTF8.GetBytes(plaintext);
            byte[] aesKey;
            string result;

            if (recipientPemOrPassword.Contains("BEGIN PUBLIC KEY"))
            {
                aesKey = RandomBytes(32);

                using var rsa = RSA.Create();
                rsa.ImportFromPem(recipientPemOrPassword.AsSpan());
                byte[] encKey = rsa.Encrypt(aesKey, RSAEncryptionPadding.OaepSHA1);

                var cipherBytes = EncryptAes(plainBytes, aesKey, out var iv, out var tag);

                result = string.Join("|",
                    "rsa",
                    Convert.ToBase64String(encKey),
                    "",
                    Convert.ToBase64String(cipherBytes),
                    Convert.ToBase64String(iv),
                    Convert.ToBase64String(tag)
                );
            }
            else
            {
                byte[] salt = RandomBytes(16);
                using var derive = new Rfc2898DeriveBytes(recipientPemOrPassword, salt, 100000, HashAlgorithmName.SHA256);
                aesKey = derive.GetBytes(32);

                var cipherBytes = EncryptAes(plainBytes, aesKey, out var iv, out var tag);

                // method|""|salt|cipher|iv|tag
                result = string.Join("|",
                    "password",
                    "",
                    Convert.ToBase64String(salt),
                    Convert.ToBase64String(cipherBytes),
                    Convert.ToBase64String(iv),
                    Convert.ToBase64String(tag)
                );
            }

            return result;
        }


        public string DecryptEnvelope(string method, string encKey, string iv, string tag, string ciphertext, string privateKeyPem)
        {
            byte[] aesKey;

            if (method == "rsa")
            {
                byte[] encKeyBytes = Convert.FromBase64String(encKey);
                using var rsa = RSA.Create();
                rsa.ImportFromPem(privateKeyPem.AsSpan());
                aesKey = rsa.Decrypt(encKeyBytes, RSAEncryptionPadding.OaepSHA1);
            }
            else if (method == "password")
            {
                throw new Exception("password mode not supported in this overload");
            }
            else throw new Exception("unsupported method");

            byte[] ivBytes = Convert.FromBase64String(iv);
            byte[] tagBytes = Convert.FromBase64String(tag);
            byte[] cipherBytes = Convert.FromBase64String(ciphertext);

            byte[] plainBytes = new byte[cipherBytes.Length];
            using var aes = new AesGcm(aesKey);
            aes.Decrypt(ivBytes, cipherBytes, tagBytes, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }


        private static byte[] EncryptAes(byte[] plaintext, byte[] key, out byte[] iv, out byte[] tag)
        {
            iv = RandomBytes(12);
            tag = new byte[16];
            byte[] cipher = new byte[plaintext.Length];
            using var aes = new AesGcm(key);
            aes.Encrypt(iv, plaintext, cipher, tag);
            return cipher;
        }

        private static byte[] DecryptAes(byte[] ciphertext, byte[] key, byte[] iv, byte[] tag)
        {
            byte[] plain = new byte[ciphertext.Length];
            using var aes = new AesGcm(key);
            aes.Decrypt(iv, ciphertext, tag, plain);
            return plain;
        }

        private static byte[] RandomBytes(int len)
        {
            byte[] b = new byte[len];
            RandomNumberGenerator.Fill(b);
            return b;
        }


        public bool VerifyJson(string json, string publicKeyPem)
        {
            using var doc = JsonDocument.Parse(json);
            var element = doc.RootElement;
            if (element.ValueKind != JsonValueKind.Object) return false;

            var dict = element.EnumerateObject()
                .ToDictionary(p => p.Name, p => (object)Canonicalize(p.Value));

            if (!dict.ContainsKey("sig")) return false;
            string sig = dict["sig"]?.ToString() ?? "";
            dict.Remove("sig");

            return VerifyData(dict, sig, publicKeyPem);
        }

        public object Canonicalize(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.Object => element.EnumerateObject()
                    .OrderBy(p => p.Name)
                    .ToDictionary(p => p.Name, p => Canonicalize(p.Value)),
                JsonValueKind.Array => element.EnumerateArray().Select(Canonicalize).ToList(),
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => element.ToString()
            };
        }

        public string StableStringify(object data)
        {
            string json = data is string s ? s : JsonSerializer.Serialize(data);
            using var doc = JsonDocument.Parse(json);
            var canonical = Canonicalize(doc.RootElement);
            return JsonSerializer.Serialize(canonical, new JsonSerializerOptions
            {
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });
        }

        public string SignData(object data, string privateKeyPem)
        {
            string payload = StableStringify(data);
            using var rsa = RSA.Create();
            rsa.ImportFromPem(privateKeyPem.AsSpan());
            byte[] bytes = Encoding.UTF8.GetBytes(payload);
            byte[] sig = rsa.SignData(bytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            return Convert.ToBase64String(sig);
        }

        public bool VerifyData(object data, string signatureBase64, string publicKeyPem)
        {
            string payload = StableStringify(data);
            using var rsa = RSA.Create();
            rsa.ImportFromPem(publicKeyPem.AsSpan());
            byte[] bytes = Encoding.UTF8.GetBytes(payload);
            byte[] sig = Convert.FromBase64String(signatureBase64);
            return rsa.VerifyData(bytes, sig, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        }

        public string SignString(string text, string key)
        {
            if (!Form1.HandleArgs(text)) return "";

            if (key == null)
            {
                Logger.Log($"Cant sign string {text} because no key supplied");
                Debug.WriteLine($"Cant sign string {text} because no key supplied");
                return ""; 
            }

            using var rsa = RSA.Create();
            rsa.ImportFromPem(key.AsSpan());
            byte[] bytes = Encoding.UTF8.GetBytes(text);
            byte[] sig = rsa.SignData(bytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            return Convert.ToBase64String(sig);
        }

        public bool VerifyString(string text, string signatureBase64, string publicKeyPem)
        {
            if (!Form1.HandleArgs(text, signatureBase64, publicKeyPem)) return false;

            using var rsa = RSA.Create();
            rsa.ImportFromPem(publicKeyPem.AsSpan());
            byte[] bytes = Encoding.UTF8.GetBytes(text);
            byte[] sig = Convert.FromBase64String(signatureBase64);
            return rsa.VerifyData(bytes, sig, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        }


        public string SignJson(string json, string privateKeyPem = null)
        {
            if (!Form1.HandleArgs(json)) return "";

            if (privateKeyPem == null)
            {
                var pair = EnsureKeyPair();
                privateKeyPem = pair.PrivateKey;
            }

            using var doc = JsonDocument.Parse(json);
            var canonical = Canonicalize(doc.RootElement);

            var canonicalJson = JsonSerializer.Serialize(canonical, new JsonSerializerOptions
            {
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = false
            });

            var sig = SignData(canonicalJson, privateKeyPem);

            using var original = JsonDocument.Parse(json);
            var dict = original.RootElement.EnumerateObject()
                .ToDictionary(p => p.Name, p => (object)Canonicalize(p.Value));

            dict["sig"] = sig;
            return JsonSerializer.Serialize(dict, new JsonSerializerOptions
            {
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = false
            });
        }
    }
}
