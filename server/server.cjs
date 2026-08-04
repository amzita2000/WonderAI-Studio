require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { fal } = require("@fal-ai/client");

const app = express();

/* =========================================================
   APP CONFIGURATION
========================================================= */

const PORT = 3001;
const FAL_KEY = process.env.FAL_KEY;

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(
  express.json({
    limit: "10mb",
  })
);

/* =========================================================
   FAL CONFIGURATION
========================================================= */

if (!FAL_KEY) {
  console.log("❌ FAL_KEY was NOT found.");
  console.log("Create/update your .env file with:");
  console.log("FAL_KEY=your_fal_api_key");
} else {
  console.log("✅ FAL_KEY loaded successfully.");
}

fal.config({
  credentials: FAL_KEY,
});

/* =========================================================
   MODELS
========================================================= */

const IMAGE_MODEL = "fal-ai/fast-sdxl";
const VIDEO_I2V_MODEL = "fal-ai/wan-i2v";
const VIDEO_T2V_MODEL = "fal-ai/wan-t2v";

/* =========================================================
   BASIC TEST
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WonderAI Studio backend is running 🚀",
    falKeyLoaded: Boolean(FAL_KEY),

    models: {
      image: IMAGE_MODEL,
      imageToVideo: VIDEO_I2V_MODEL,
      textToVideo: VIDEO_T2V_MODEL,
    },

    features: {
      promptEnhancer: true,
      imageGeneration: true,
      characterGeneration: true,
      imageToVideo: true,
      textToVideo: true,
      healthCheck: true,
    },
  });
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    falKeyLoaded: Boolean(FAL_KEY),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   HELPERS
========================================================= */

function requireFalKey(res) {
  if (!FAL_KEY) {
    res.status(500).json({
      success: false,
      error:
        "FAL_KEY is missing. Please add FAL_KEY to your .env file and restart the server.",
    });

    return false;
  }

  return true;
}

/* ---------------------------------------------------------
   IMAGE SIZE
--------------------------------------------------------- */

function getImageSize(aspectRatio) {
  switch (aspectRatio) {
    case "1:1 Square":
      return "square";

    case "9:16 Portrait":
      return "portrait_16_9";

    case "4:3 Classic":
      return "landscape_4_3";

    case "16:9 Landscape":
    default:
      return "landscape_16_9";
  }
}

/* ---------------------------------------------------------
   VIDEO ASPECT RATIO
--------------------------------------------------------- */

function getVideoAspectRatio(aspectRatio) {
  switch (aspectRatio) {
    case "1:1 Square":
      return "1:1";

    case "9:16 Portrait":
      return "9:16";

    case "16:9 Landscape":
      return "16:9";

    case "4:3 Classic":
      return "16:9";

    default:
      return "16:9";
  }
}

/* ---------------------------------------------------------
   FAL ERROR HANDLER
--------------------------------------------------------- */

function getFalErrorMessage(error) {
  const status =
    error?.status ||
    error?.statusCode ||
    error?.response?.status ||
    error?.body?.status;

  const possibleMessages = [
    error?.message,
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.body?.message,
    error?.body?.error,
    error?.body?.detail,
    error?.response?.data?.detail,
  ];

  const message =
    possibleMessages.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    ) || "";

  const text = String(message).toLowerCase();

  console.error("--------------- FAL ERROR ---------------");
  console.error("Status:", status);
  console.error("Message:", message);
  console.error("Response:", error?.response?.data);
  console.error("Body:", error?.body);
  console.error("------------------------------------------");

  /* -------------------------------------------------------
     BALANCE / BILLING
  ------------------------------------------------------- */

  if (
    text.includes("exhausted balance") ||
    text.includes("top up your balance") ||
    text.includes("insufficient balance") ||
    text.includes("insufficient funds") ||
    text.includes("credits exhausted") ||
    text.includes("out of credits") ||
    text.includes("billing")
  ) {
    return (
      "Your FAL account has no available balance for this generation. " +
      "The WonderAI code is connected correctly, but FAL requires available credits."
    );
  }

  /* -------------------------------------------------------
     AUTH
  ------------------------------------------------------- */

  if (
    status === 401 ||
    text.includes("unauthorized") ||
    text.includes("invalid api key") ||
    text.includes("invalid key")
  ) {
    return (
      "FAL rejected the API key. " +
      "Please check FAL_KEY in your .env file."
    );
  }

  /* -------------------------------------------------------
     FORBIDDEN
  ------------------------------------------------------- */

  if (status === 403) {
    return (
      "FAL rejected the request. " +
      "Please check your FAL account status, balance, billing, and model access."
    );
  }

  /* -------------------------------------------------------
     PAYMENT
  ------------------------------------------------------- */

  if (
    status === 402 ||
    text.includes("payment required")
  ) {
    return (
      "FAL requires available credits or billing for this generation."
    );
  }

  /* -------------------------------------------------------
     RATE LIMIT
  ------------------------------------------------------- */

  if (
    status === 429 ||
    text.includes("rate limit") ||
    text.includes("too many requests")
  ) {
    return (
      "FAL rate limit reached. Please wait a moment and try again."
    );
  }

  /* -------------------------------------------------------
     MODEL / VALIDATION
  ------------------------------------------------------- */

  if (
    status === 400 ||
    text.includes("invalid input") ||
    text.includes("validation")
  ) {
    return (
      "FAL rejected the generation settings. " +
      "Please check the prompt and selected options."
    );
  }

  if (message) {
    return String(message);
  }

  return "FAL request failed. Please try again.";
}

/* =========================================================
   PROMPT ENHANCER
========================================================= */

app.post("/api/enhance", (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter an idea first.",
      });
    }

    const enhancedPrompt =
      `${prompt.trim()}, ` +
      `highly detailed, cinematic composition, ` +
      `beautiful lighting, rich colors, ` +
      `professional quality, sharp focus, ` +
      `atmospheric depth, visually stunning`;

    return res.json({
      success: true,
      enhancedPrompt,
    });
  } catch (error) {
    console.error("❌ Enhance error:", error);

    return res.status(500).json({
      success: false,
      error: "Prompt enhancement failed.",
    });
  }
});

/* =========================================================
   IMAGE GENERATION
========================================================= */

app.post("/api/generate-image", async (req, res) => {
  try {
    const {
      prompt,
      style = "3D Cartoon",
      aspectRatio = "16:9 Landscape",
      quality = "HD",
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter an image prompt first.",
      });
    }

    if (!requireFalKey(res)) {
      return;
    }

    const imageSize = getImageSize(aspectRatio);

    const steps =
      quality === "HD"
        ? 20
        : quality === "Full HD"
        ? 25
        : quality === "2K"
        ? 28
        : 30;

    const finalPrompt =
      `${prompt.trim()}, ` +
      `${style} style, ` +
      `highly detailed, beautiful lighting, ` +
      `rich colors, sharp focus, ` +
      `professional quality, atmospheric depth`;

    console.log("");
    console.log("=================================");
    console.log("🎨 WONDERAI IMAGE GENERATION");
    console.log("=================================");
    console.log("Model:", IMAGE_MODEL);
    console.log("Style:", style);
    console.log("Aspect Ratio:", aspectRatio);
    console.log("Image Size:", imageSize);
    console.log("Quality:", quality);
    console.log("Steps:", steps);
    console.log("=================================");

    const result = await fal.subscribe(IMAGE_MODEL, {
      input: {
        prompt: finalPrompt,

        num_images: 1,

        image_size: imageSize,

        format: "jpeg",

        enable_safety_checker: true,

        num_inference_steps: steps,

        guidance_scale: 7.5,
      },

      logs: true,

      onQueueUpdate: (update) => {
        console.log(
          "IMAGE FAL STATUS:",
          update.status
        );

        if (
          update.status === "IN_PROGRESS" &&
          update.logs
        ) {
          update.logs.forEach((log) => {
            console.log(log.message);
          });
        }
      },
    });

    const image =
      result?.data?.images?.[0]?.url || null;

    if (!image) {
      console.error("❌ No image returned.");
      console.error("Result:", result);

      return res.status(500).json({
        success: false,
        error:
          "FAL completed the request but returned no image.",
      });
    }

    console.log("✅ IMAGE URL RECEIVED");

    return res.json({
      success: true,
      image,
      prompt: finalPrompt,
      style,
      aspectRatio,
      quality,
      model: IMAGE_MODEL,
    });
  } catch (error) {
    console.error("❌ IMAGE GENERATION FAILED");

    return res.status(error?.status || 500).json({
      success: false,
      error: getFalErrorMessage(error),
    });
  }
});

/* =========================================================
   CHARACTER IMAGE GENERATION
========================================================= */

app.post("/api/generate-character", async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = "1:1 Square",
      quality = "HD",
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Character prompt is required.",
      });
    }

    if (!requireFalKey(res)) {
      return;
    }

    const imageSize = getImageSize(aspectRatio);

    const steps =
      quality === "HD"
        ? 20
        : quality === "Full HD"
        ? 25
        : quality === "2K"
        ? 28
        : 30;

    const characterPrompt =
      `${prompt.trim()}, ` +
      `single character reference image, ` +
      `full body, centered character, ` +
      `clear face, expressive eyes, ` +
      `consistent body proportions, ` +
      `recognizable hairstyle, ` +
      `consistent clothing, ` +
      `clean simple background, ` +
      `children's animation quality, ` +
      `3D cartoon render, ` +
      `highly detailed, beautiful lighting, ` +
      `vibrant colors`;

    console.log("");
    console.log("=================================");
    console.log("👤 WONDERAI CHARACTER GENERATION");
    console.log("=================================");
    console.log("Model:", IMAGE_MODEL);
    console.log("Image Size:", imageSize);
    console.log("=================================");

    const result = await fal.subscribe(IMAGE_MODEL, {
      input: {
        prompt: characterPrompt,

        num_images: 1,

        image_size: imageSize,

        format: "jpeg",

        enable_safety_checker: true,

        num_inference_steps: steps,

        guidance_scale: 7.5,
      },

      logs: true,

      onQueueUpdate: (update) => {
        console.log(
          "CHARACTER FAL STATUS:",
          update.status
        );
      },
    });

    const image =
      result?.data?.images?.[0]?.url || null;

    if (!image) {
      return res.status(500).json({
        success: false,
        error:
          "Character image was not returned by FAL.",
      });
    }

    console.log(
      "✅ CHARACTER IMAGE URL RECEIVED"
    );

    return res.json({
      success: true,
      image,
      prompt: characterPrompt,
      model: IMAGE_MODEL,
    });
  } catch (error) {
    console.error(
      "❌ CHARACTER IMAGE GENERATION FAILED"
    );

    return res.status(error?.status || 500).json({
      success: false,
      error: getFalErrorMessage(error),
    });
  }
});

/* =========================================================
   VIDEO GENERATION
   IMAGE → VIDEO + TEXT → VIDEO
========================================================= */

app.post("/api/generate-video", async (req, res) => {
  try {
    const {
      prompt,
      imageUrl,
      aspectRatio = "16:9 Landscape",
      resolution = "480p",
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter a video prompt.",
      });
    }

    if (!requireFalKey(res)) {
      return;
    }

    const videoAspectRatio =
      getVideoAspectRatio(aspectRatio);

    let result;
    let source;

    /* =====================================================
       IMAGE → VIDEO
    ===================================================== */

    if (imageUrl) {
      source = "image-to-video";

      console.log("");
      console.log("=================================");
      console.log("🎬 WONDERAI IMAGE → VIDEO");
      console.log("=================================");
      console.log(
        "Model:",
        VIDEO_I2V_MODEL
      );
      console.log(
        "Aspect Ratio:",
        videoAspectRatio
      );
      console.log(
        "Resolution:",
        resolution
      );
      console.log(
        "Source Image:",
        imageUrl
      );
      console.log("=================================");

      result = await fal.subscribe(
        VIDEO_I2V_MODEL,
        {
          input: {
            prompt: prompt.trim(),

            image_url: imageUrl,

            aspect_ratio:
              videoAspectRatio,

            resolution:
              resolution === "720p"
                ? "720p"
                : "480p",

            num_frames: 81,

            frames_per_second: 16,

            enable_safety_checker: true,

            enable_prompt_expansion: true,

            acceleration: "regular",
          },

          logs: true,

          onQueueUpdate: (update) => {
            console.log(
              "I2V FAL STATUS:",
              update.status
            );

            if (
              update.status === "IN_PROGRESS" &&
              update.logs
            ) {
              update.logs.forEach(
                (log) => {
                  console.log(
                    log.message
                  );
                }
              );
            }
          },
        }
      );
    }

    /* =====================================================
       TEXT → VIDEO
    ===================================================== */

    else {
      source = "text-to-video";

      console.log("");
      console.log("=================================");
      console.log("🎬 WONDERAI TEXT → VIDEO");
      console.log("=================================");
      console.log(
        "Model:",
        VIDEO_T2V_MODEL
      );
      console.log(
        "Aspect Ratio:",
        videoAspectRatio
      );
      console.log(
        "Resolution:",
        resolution
      );
      console.log("=================================");

      /*
        WAN T2V currently supports 16:9
        and 9:16. 1:1 is therefore
        converted to 16:9 above.
      */

      result = await fal.subscribe(
        VIDEO_T2V_MODEL,
        {
          input: {
            prompt: prompt.trim(),

            aspect_ratio:
              videoAspectRatio === "9:16"
                ? "9:16"
                : "16:9",

            resolution:
              resolution === "720p"
                ? "720p"
                : "480p",

            num_frames: 81,

            frames_per_second: 16,

            enable_safety_checker: true,

            enable_prompt_expansion: true,

            turbo_mode: false,
          },

          logs: true,

          onQueueUpdate: (update) => {
            console.log(
              "T2V FAL STATUS:",
              update.status
            );

            if (
              update.status === "IN_PROGRESS" &&
              update.logs
            ) {
              update.logs.forEach(
                (log) => {
                  console.log(
                    log.message
                  );
                }
              );
            }
          },
        }
      );
    }

    /* =====================================================
       VIDEO RESULT
    ===================================================== */

    const video =
      result?.data?.video?.url || null;

    if (!video) {
      console.error(
        "❌ FAL returned no video."
      );

      console.error(
        "VIDEO RESULT:",
        result
      );

      return res.status(500).json({
        success: false,
        error:
          "FAL completed the request but returned no video.",
      });
    }

    console.log(
      "✅ VIDEO URL RECEIVED"
    );

    return res.json({
      success: true,
      video,

      prompt: prompt.trim(),

      source,

      imageUrl:
        imageUrl || null,

      aspectRatio,

      resolution,

      model:
        imageUrl
          ? VIDEO_I2V_MODEL
          : VIDEO_T2V_MODEL,
    });
  } catch (error) {
    console.error(
      "❌ VIDEO GENERATION FAILED"
    );

    return res.status(error?.status || 500).json({
      success: false,
      error: getFalErrorMessage(error),
    });
  }
});

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:
      "WonderAI API route not found.",
    path: req.originalUrl,
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "❌ GLOBAL SERVER ERROR:"
    );

    console.error(error);

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      success: false,
      error:
        "Unexpected WonderAI server error.",
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log("");
  console.log(
    "================================="
  );
  console.log(
    "🚀 WONDERAI STUDIO BACKEND"
  );
  console.log(
    "================================="
  );
  console.log(
    `Server: http://localhost:${PORT}`
  );
  console.log(
    `FAL Key: ${
      FAL_KEY
        ? "✅ Loaded"
        : "❌ Missing"
    }`
  );
  console.log(
    `Image: ${IMAGE_MODEL}`
  );
  console.log(
    `Image → Video: ${VIDEO_I2V_MODEL}`
  );
  console.log(
    `Text → Video: ${VIDEO_T2V_MODEL}`
  );
  console.log(
    "================================="
  );
  console.log("");
});