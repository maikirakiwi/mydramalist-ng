"""Score upright faces at each clockwise rotation; image bytes arrive on stdin."""
import json
import sys

import cv2
import numpy as np

image = cv2.imdecode(np.frombuffer(sys.stdin.buffer.read(), dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
if image is None:
    raise ValueError('Cannot decode poster')
scale = 1000 / max(image.shape)
image = cv2.resize(image, (int(image.shape[1] * scale), int(image.shape[0] * scale)))
detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
scores = []
for rotation in range(4):
    _, _, weights = detector.detectMultiScale3(
        image, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30), outputRejectLevels=True
    )
    scores.append(round(sum(float(weight) for weight in weights if weight >= 3), 2))
    image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
print(json.dumps(scores))
