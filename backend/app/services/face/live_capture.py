import cv2
import os
import uuid
from pathlib import Path

def capture_live_image(save_dir: str) -> str:
    """Capture a single frame from the default webcam and save as JPEG.
    Returns the file path of the saved image.
    """
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Cannot open webcam (device 0)")
    ret, frame = cap.read()
    cap.release()
    if not ret:
        raise RuntimeError("Failed to capture image from webcam")
    os.makedirs(save_dir, exist_ok=True)
    filename = f"live_{uuid.uuid4().hex[:8]}.jpg"
    path = os.path.join(save_dir, filename)
    cv2.imwrite(path, frame)
    return path
