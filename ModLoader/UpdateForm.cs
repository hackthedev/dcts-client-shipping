using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace DCTS
{
    public partial class UpdateForm : Form
    {
        [DllImport("dwmapi.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;

        private void EnableDarkTitlebar(IntPtr handle)
        {
            int useDark = 1;
            DwmSetWindowAttribute(handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDark, sizeof(int));
        }


        private void UpdateForm_Load(object sender, EventArgs e)
        {

        }

        public UpdateForm()
        {
            InitializeComponent();
        }
    }
}
