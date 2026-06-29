/**
 * CMYK post-processing conversion utility.
 * Generates and downloads a helper Python script next to the exported PDF.
 * This script uses Ghostscript to convert the PDF to print-ready DeviceCMYK space.
 */
export function downloadCmykScript(pdfFileName) {
  const scriptName = pdfFileName.replace(/\.pdf$/i, '') + '_cmyk_converter.py';
  const outputPdfName = pdfFileName.replace(/\.pdf$/i, '') + '_CMYK.pdf';

  const scriptContent = `import subprocess
import os
import sys
import platform

def convert_rgb_to_cmyk_improved(input_path, output_path):
    print(f"--- 🎨 Starting ENHANCED CMYK Conversion for: {os.path.basename(input_path)} ---")
    
    if not os.path.exists(input_path):
        print(f"❌ Error: Could not find '{input_path}'")
        return

    system = platform.system()
    if system == "Windows":
        gs_cmd = "gswin64c" 
    else:
        gs_cmd = "gs"

    # ENHANCED ARGUMENTS FOR BETTER DETAIL AND CONTRAST
    gs_args = [
        gs_cmd,
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-dNOCACHE",
        "-sDEVICE=pdfwrite",
        "-sColorConversionStrategy=CMYK",
        "-dProcessColorModel=/DeviceCMYK",
        "-dOverrideICC=true",
        
        # 1. PERCEPTUAL RENDERING INTENT
        # Scales the entire color gamut so that relationships between 
        # colors are maintained, preserving fine details in highlights and shadows!
        "-dRenderIntent=0", 
        
        # 2. BLACK POINT COMPENSATION
        # Maps the darkest RGB black to the darkest possible CMYK black,
        # preventing washed-out gray shadows.
        "-dBlackPointCompensation=true",
        
        f"-sOutputFile={output_path}",
        input_path
    ]

    print(f"Executing command: {' '.join(gs_args)}")
    try:
        subprocess.run(gs_args, check=True)
        print(f"\\n✅ SUCCESS: Enhanced file saved as '{output_path}'.")
        print("Your details and shadow contrast should look noticeably better for printing!")
        
    except FileNotFoundError:
        print(f"\\n❌ ERROR: Ghostscript ('{gs_cmd}') is not installed or not in your system's PATH.")
        print("Please install Ghostscript (https://www.ghostscript.com/download.html) to enable CMYK conversion.")
    except subprocess.CalledProcessError as e:
        print(f"\\n❌ ERROR: Ghostscript encountered an issue. Code: {e.returncode}")

if __name__ == "__main__":
    input_file = "${pdfFileName}"
    output_file = "${outputPdfName}"

    if len(sys.argv) == 3:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        
    convert_rgb_to_cmyk_improved(input_file, output_file)
`;

  const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = scriptName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
