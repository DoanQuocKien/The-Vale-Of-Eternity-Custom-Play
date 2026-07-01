import sys
import os
import subprocess
import urllib.request

def download_model_with_progress(url, dest_path):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    print(f"Downloading model from {url}...")
    
    # Simple console progress reporter
    last_reported = -1
    def report_hook(block_num, block_size, total_size):
        nonlocal last_reported
        if total_size > 0:
            percent = int(block_num * block_size * 100 / total_size)
            percent = min(100, percent)
            if percent != last_reported:
                print(f"Downloading: {percent}%", flush=True)
                last_reported = percent
            
    try:
        urllib.request.urlretrieve(url, dest_path, reporthook=report_hook)
        print("Download complete.", flush=True)
    except Exception as e:
        print(f"Download failed: {str(e)}", flush=True)
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise e

# Pre-download the model if not present to show progress
u2net_home = os.environ.get(
    "U2NET_HOME",
    os.path.expanduser(os.path.join("~", ".u2net"))
)
model_path = os.path.join(u2net_home, "u2net.onnx")

if not os.path.exists(model_path):
    model_url = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx"
    try:
        download_model_with_progress(model_url, model_path)
    except Exception as e:
        sys.exit(1)

is_frozen = getattr(sys, 'frozen', False)

def install_and_import(package):
    try:
        __import__(package)
    except ImportError as e:
        if is_frozen:
            print(f"Error: Required package '{package}' is missing from the compiled binary: {str(e)}")
            sys.exit(1)
        else:
            print(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Ensure pillow and rembg are installed
try:
    install_and_import('PIL')
    install_and_import('rembg')
except Exception as e:
    print(f"Dependency installation failed: {str(e)}")
    sys.exit(1)

from PIL import Image
from rembg import remove

def main():
    if len(sys.argv) < 3:
        print("Usage: python bg_remove.py <input_path> <output_path>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        sys.exit(1)
        
    try:
        print("Processing background removal using local Python rembg...")
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error during background removal: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
