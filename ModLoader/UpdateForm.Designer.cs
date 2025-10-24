namespace DCTS
{
    partial class UpdateForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            progressBar1 = new ProgressBar();
            label1 = new Label();
            SuspendLayout();
            // 
            // progressBar1
            // 
            progressBar1.Anchor = AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            progressBar1.ForeColor = Color.IndianRed;
            progressBar1.Location = new Point(32, 68);
            progressBar1.MarqueeAnimationSpeed = 1;
            progressBar1.Name = "progressBar1";
            progressBar1.Size = new Size(983, 40);
            progressBar1.Step = 500;
            progressBar1.Style = ProgressBarStyle.Marquee;
            progressBar1.TabIndex = 0;
            // 
            // label1
            // 
            label1.AutoSize = true;
            label1.Location = new Point(32, 20);
            label1.Name = "label1";
            label1.Size = new Size(172, 30);
            label1.TabIndex = 1;
            label1.Text = "Updating Client...";
            // 
            // UpdateForm
            // 
            AutoScaleDimensions = new SizeF(12F, 30F);
            AutoScaleMode = AutoScaleMode.Font;
            BackColor = Color.FromArgb(38, 40, 42);
            ClientSize = new Size(1039, 129);
            ControlBox = false;
            Controls.Add(label1);
            Controls.Add(progressBar1);
            ForeColor = Color.White;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            MinimizeBox = false;
            Name = "UpdateForm";
            Padding = new Padding(20);
            ShowIcon = false;
            StartPosition = FormStartPosition.CenterScreen;
            Text = "DCTS Update";
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private ProgressBar progressBar1;
        private Label label1;
    }
}