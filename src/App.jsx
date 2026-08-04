import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://wonderai-studio.onrender.com";

const EMPTY_CHARACTER = {
  name: "",
  age: "",
  gender: "Girl",
  hair: "",
  outfit: "",
  personality: "",
  description: "",
};

function App() {
  /* =========================================================
     MAIN STATE
  ========================================================= */

  const [mode, setMode] = useState("image");

  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");

  const [style, setStyle] = useState("3D Cartoon");
  const [aspectRatio, setAspectRatio] = useState("16:9 Landscape");
  const [quality, setQuality] = useState("HD");

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedImage, setGeneratedImage] = useState("");
  const [generatedVideo, setGeneratedVideo] = useState("");

  const [generationError, setGenerationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [creations, setCreations] = useState([]);
  const [characters, setCharacters] = useState([]);

  const [videoSourceImage, setVideoSourceImage] = useState("");

  /* =========================================================
     CHARACTER STATE
  ========================================================= */

  const [character, setCharacter] = useState(
    EMPTY_CHARACTER
  );

  const [characterPrompt, setCharacterPrompt] =
    useState("");

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    try {
      const savedCreations = localStorage.getItem(
        "wonderai-creations"
      );

      const savedCharacters = localStorage.getItem(
        "wonderai-characters"
      );

      if (savedCreations) {
        const parsed = JSON.parse(savedCreations);

        if (Array.isArray(parsed)) {
          setCreations(parsed);
        }
      }

      if (savedCharacters) {
        const parsed = JSON.parse(savedCharacters);

        if (Array.isArray(parsed)) {
          setCharacters(parsed);
        }
      }
    } catch (error) {
      console.error(
        "WonderAI local storage loading error:",
        error
      );

      setGenerationError(
        "Some saved data could not be loaded."
      );
    }
  }, []);

  /* =========================================================
     SAVE LOCAL STORAGE
  ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        "wonderai-creations",
        JSON.stringify(creations)
      );
    } catch (error) {
      console.error(
        "Could not save creations:",
        error
      );
    }
  }, [creations]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "wonderai-characters",
        JSON.stringify(characters)
      );
    } catch (error) {
      console.error(
        "Could not save characters:",
        error
      );
    }
  }, [characters]);

  /* =========================================================
     HELPERS
  ========================================================= */

  const clearMessages = () => {
    setGenerationError("");
    setSuccessMessage("");
  };

  const clearResults = () => {
    setGeneratedImage("");
    setGeneratedVideo("");
    setGenerationError("");
  };

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const getFriendlyError = (error) => {
    const message =
      error?.message ||
      "Something went wrong.";

    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError")
    ) {
      return (
        "Cannot connect to WonderAI backend. " +
        "Please make sure server/server.cjs is running on port 3001."
      );
    }

    return message;
  };

  /* =========================================================
     API REQUEST
  ========================================================= */

  const apiRequest = async (
    endpoint,
    body = {}
  ) => {
    let response;

    try {
      response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
    } catch (error) {
      throw new Error(
        "Cannot connect to WonderAI backend. " +
          "Please start the backend with: node server/server.cjs"
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The WonderAI server returned an invalid response."
      );
    }

    if (!response.ok || data.success === false) {
      throw new Error(
        data.error ||
          `Request failed with status ${response.status}.`
      );
    }

    return data;
  };

  /* =========================================================
     PROMPT ENHANCER
  ========================================================= */

  const enhancePrompt = async () => {
    if (!prompt.trim()) {
      setGenerationError(
        "Please enter an idea first."
      );
      return;
    }

    clearMessages();
    setIsEnhancing(true);

    try {
      const data = await apiRequest(
        "/api/enhance",
        {
          prompt: prompt.trim(),
        }
      );

      const enhanced =
        data.enhancedPrompt || "";

      setEnhancedPrompt(enhanced);

      if (enhanced) {
        setPrompt(enhanced);
      }

      setSuccessMessage(
        "✨ Prompt enhanced successfully!"
      );
    } catch (error) {
      console.error(
        "Prompt enhancement error:",
        error
      );

      setGenerationError(
        getFriendlyError(error)
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  /* =========================================================
     IMAGE GENERATION
  ========================================================= */

  const generateImage = async (
    customPrompt = null
  ) => {
    const finalPrompt =
      customPrompt !== null
        ? customPrompt.trim()
        : prompt.trim();

    if (!finalPrompt) {
      setGenerationError(
        "Please describe the image you want to create."
      );
      return false;
    }

    clearMessages();
    setIsGenerating(true);

    setGeneratedImage("");
    setGeneratedVideo("");

    try {
      const data = await apiRequest(
        "/api/generate-image",
        {
          prompt: finalPrompt,
          style,
          aspectRatio,
          quality,
        }
      );

      if (!data.image) {
        throw new Error(
          "The server completed the request but no image was returned."
        );
      }

      setGeneratedImage(data.image);

      setSuccessMessage(
        "✨ Your image is ready!"
      );

      return true;
    } catch (error) {
      console.error(
        "Image generation error:",
        error
      );

      setGenerationError(
        getFriendlyError(error)
      );

      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  /* =========================================================
     VIDEO GENERATION
  ========================================================= */

  const generateVideo = async () => {
    if (!prompt.trim()) {
      setGenerationError(
        "Please describe the video you want to create."
      );
      return;
    }

    const sourceImage =
      videoSourceImage ||
      generatedImage ||
      null;

    clearMessages();
    setIsGenerating(true);

    setGeneratedVideo("");

    try {
      const data = await apiRequest(
        "/api/generate-video",
        {
          prompt: prompt.trim(),
          imageUrl: sourceImage,
          aspectRatio,
        }
      );

      if (!data.video) {
        throw new Error(
          "The server completed the request but no video was returned."
        );
      }

      setGeneratedVideo(data.video);

      setSuccessMessage(
        sourceImage
          ? "🎬 Your image has been animated!"
          : "🎬 Your video is ready!"
      );
    } catch (error) {
      console.error(
        "Video generation error:",
        error
      );

      setGenerationError(
        getFriendlyError(error)
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /* =========================================================
     MAIN GENERATE
  ========================================================= */

  const generate = async () => {
    if (isGenerating || isEnhancing) {
      return;
    }

    if (mode === "image") {
      await generateImage();
      return;
    }

    await generateVideo();
  };

  /* =========================================================
     CHARACTER INPUT
  ========================================================= */

  const updateCharacter = (
    field,
    value
  ) => {
    setCharacter((previous) => ({
      ...previous,
      [field]: value,
    }));

    clearMessages();
  };

  /* =========================================================
     BUILD CHARACTER PROMPT
  ========================================================= */

  const buildCharacterPrompt = () => {
    const {
      name,
      age,
      gender,
      hair,
      outfit,
      personality,
      description,
    } = character;

    if (
      !name.trim() ||
      !age.trim() ||
      !hair.trim() ||
      !outfit.trim()
    ) {
      setGenerationError(
        "Please enter character name, age, hair and outfit."
      );

      return null;
    }

    const finalPrompt =
      `${name.trim()}, ` +
      `a ${age}-year-old ${gender}, ` +
      `${hair.trim()}, ` +
      `wearing ${outfit.trim()}. ` +
      `Personality: ${
        personality.trim() ||
        "friendly, cheerful and kind"
      }. ` +
      `${
        description.trim()
          ? `Character details: ${description.trim()}. `
          : ""
      }` +
      `Consistent character design, ` +
      `recognizable face, ` +
      `same hairstyle, ` +
      `same clothing, ` +
      `same colors, ` +
      `expressive eyes, ` +
      `full body, ` +
      `front-facing character reference, ` +
      `3D cartoon children's animation style, ` +
      `beautiful soft lighting, ` +
      `vibrant colors, ` +
      `clean background, ` +
      `highly detailed, ` +
      `professional character concept art.`;

    return finalPrompt;
  };

  /* =========================================================
     GENERATE CHARACTER PROMPT
  ========================================================= */

  const createCharacterPrompt = () => {
    clearMessages();

    const finalPrompt =
      buildCharacterPrompt();

    if (!finalPrompt) {
      return false;
    }

    setCharacterPrompt(finalPrompt);
    setPrompt(finalPrompt);
    setMode("image");

    setSuccessMessage(
      "✨ Character prompt created!"
    );

    return true;
  };

  /* =========================================================
     GENERATE CHARACTER IMAGE
     IMPORTANT: FIXES OLD ASYNC BUG
  ========================================================= */

  const generateCharacterImage = async () => {
    clearMessages();

    const finalPrompt =
      buildCharacterPrompt();

    if (!finalPrompt) {
      return;
    }

    setCharacterPrompt(finalPrompt);
    setPrompt(finalPrompt);
    setMode("image");

    setIsGenerating(true);
    setGeneratedImage("");
    setGeneratedVideo("");

    try {
      const data = await apiRequest(
        "/api/generate-character",
        {
          prompt: finalPrompt,
          aspectRatio: "1:1 Square",
          quality,
        }
      );

      if (!data.image) {
        throw new Error(
          "Character image was not returned."
        );
      }

      setGeneratedImage(data.image);

      setSuccessMessage(
        "👤 Character image generated!"
      );
    } catch (error) {
      console.error(
        "Character image generation error:",
        error
      );

      setGenerationError(
        getFriendlyError(error)
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /* =========================================================
     SAVE CHARACTER
  ========================================================= */

  const saveCharacter = () => {
    clearMessages();

    const finalPrompt =
      characterPrompt ||
      buildCharacterPrompt();

    if (!finalPrompt) {
      return;
    }

    const characterName =
      character.name.trim() ||
      "Unnamed Character";

    /* Prevent accidental duplicates */
    const duplicate = characters.some(
      (item) =>
        item.name?.trim().toLowerCase() ===
          characterName.toLowerCase() &&
        item.prompt === finalPrompt
    );

    if (duplicate) {
      setGenerationError(
        "This character is already saved in your library."
      );
      return;
    }

    const newCharacter = {
      id: Date.now(),
      ...character,
      name: characterName,
      prompt: finalPrompt,
      image: generatedImage || "",
      createdAt:
        new Date().toLocaleString(),
    };

    setCharacters((previous) => [
      newCharacter,
      ...previous,
    ]);

    setCharacterPrompt(finalPrompt);

    setSuccessMessage(
      `❤️ ${characterName} saved to Character Library!`
    );

    setTimeout(() => {
      scrollTo("character-library");
    }, 150);
  };

  /* =========================================================
     DELETE CHARACTER
  ========================================================= */

  const deleteCharacter = (id) => {
    const confirmed =
      window.confirm(
        "Delete this character from your library?"
      );

    if (!confirmed) {
      return;
    }

    setCharacters((previous) =>
      previous.filter(
        (item) => item.id !== id
      )
    );

    setSuccessMessage(
      "Character removed from your library."
    );
  };

  /* =========================================================
     REUSE CHARACTER
  ========================================================= */

  const reuseCharacter = (
    savedCharacter
  ) => {
    const reused = {
      name: savedCharacter.name || "",
      age: savedCharacter.age || "",
      gender:
        savedCharacter.gender || "Girl",
      hair: savedCharacter.hair || "",
      outfit: savedCharacter.outfit || "",
      personality:
        savedCharacter.personality || "",
      description:
        savedCharacter.description || "",
    };

    setCharacter(reused);

    const reusedPrompt =
      savedCharacter.prompt || "";

    setCharacterPrompt(
      reusedPrompt
    );

    setPrompt(reusedPrompt);

    setMode("image");

    setGeneratedImage(
      savedCharacter.image || ""
    );

    setGeneratedVideo("");

    setVideoSourceImage("");

    clearMessages();

    setSuccessMessage(
      `♻️ ${savedCharacter.name} loaded into the studio!`
    );

    setTimeout(() => {
      scrollTo("studio");
    }, 100);
  };

  /* =========================================================
     USE IMAGE FOR VIDEO
  ========================================================= */

  const animateImage = (
    imageUrl
  ) => {
    if (!imageUrl) {
      setGenerationError(
        "There is no image available to animate."
      );
      return;
    }

    setVideoSourceImage(imageUrl);
    setMode("video");
    setGeneratedVideo("");
    setGenerationError("");

    setSuccessMessage(
      "🎬 Image selected for animation. Add a motion prompt and generate."
    );

    setTimeout(() => {
      scrollTo("studio");
    }, 100);
  };

  /* =========================================================
     SAVE CREATION
  ========================================================= */

  const saveCreation = () => {
    clearMessages();

    const type = generatedVideo
      ? "video"
      : generatedImage
      ? "image"
      : null;

    if (!type) {
      setGenerationError(
        "There is no creation to save yet."
      );
      return;
    }

    const mediaUrl =
      type === "video"
        ? generatedVideo
        : generatedImage;

    /* Prevent duplicate current save */
    const duplicate = creations.some(
      (creation) =>
        creation.type === type &&
        (type === "video"
          ? creation.video === mediaUrl
          : creation.image === mediaUrl)
    );

    if (duplicate) {
      setGenerationError(
        "This creation is already saved."
      );
      return;
    }

    const newCreation = {
      id: Date.now(),
      type,
      image:
        type === "image"
          ? generatedImage
          : "",
      video:
        type === "video"
          ? generatedVideo
          : "",
      prompt,
      style,
      aspectRatio,
      quality,
      createdAt:
        new Date().toLocaleString(),
    };

    setCreations((previous) => [
      newCreation,
      ...previous,
    ]);

    setSuccessMessage(
      "❤️ Saved to My Creations!"
    );
  };

  /* =========================================================
     DELETE CREATION
  ========================================================= */

  const deleteCreation = (id) => {
    setCreations((previous) =>
      previous.filter(
        (creation) =>
          creation.id !== id
      )
    );

    setSuccessMessage(
      "Creation deleted."
    );
  };

  /* =========================================================
     CLEAR CREATIONS
  ========================================================= */

  const clearCreations = () => {
    if (creations.length === 0) {
      return;
    }

    const confirmed =
      window.confirm(
        "Clear all saved creations?"
      );

    if (!confirmed) {
      return;
    }

    setCreations([]);

    setSuccessMessage(
      "All creations cleared."
    );
  };

  /* =========================================================
     DOWNLOAD
  ========================================================= */

  const downloadFile = async (
    url,
    filename
  ) => {
    if (!url) {
      setGenerationError(
        "No file is available to download."
      );
      return;
    }

    try {
      setGenerationError("");

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          "The file could not be downloaded."
        );
      }

      const blob =
        await response.blob();

      const blobUrl =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        blobUrl
      );
    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      /*
       * Some remote media hosts don't allow
       * browser-side downloading. In that case,
       * open the file in a new tab.
       */
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  /* =========================================================
     CHARACTER COUNT
  ========================================================= */

  const promptCount = useMemo(
    () => prompt.length,
    [prompt]
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">

        <div
          className="logo"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          <span className="logo-icon">
            ✦
          </span>

          <span>
            WonderAI Studio
          </span>
        </div>

        <div className="header-right">

          <button
            className="header-button"
            onClick={() =>
              scrollTo("my-creations")
            }
          >
            My Creations
          </button>

          <button
            className="header-button"
            onClick={() =>
              scrollTo(
                "character-library"
              )
            }
          >
            Characters
          </button>

          <div className="avatar">
            A
          </div>

        </div>

      </header>

      <main className="main">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="hero">

          <p className="eyebrow">
            AI CREATIVE STUDIO
          </p>

          <h1>
            Turn your imagination
            <br />
            <span>
              into reality.
            </span>
          </h1>

          <p className="subtitle">
            Create stunning images,
            characters and videos with
            simple prompts.
          </p>

        </section>

        {/* =================================================
            GLOBAL MESSAGES
        ================================================= */}

        {successMessage && (
          <div className="success-message">
            <span>✓</span>

            <p>
              {successMessage}
            </p>

            <button
              onClick={() =>
                setSuccessMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* =================================================
            STUDIO
        ================================================= */}

        <section
          className="creator-card"
          id="studio"
        >

          {/* MODE SWITCHER */}

          <div className="mode-switcher">

            <button
              className={
                mode === "image"
                  ? "mode active"
                  : "mode"
              }
              onClick={() => {
                setMode("image");
                clearMessages();
              }}
              disabled={isGenerating}
            >
              🖼️ Image
            </button>

            <button
              className={
                mode === "video"
                  ? "mode active"
                  : "mode"
              }
              onClick={() => {
                setMode("video");
                clearMessages();
              }}
              disabled={isGenerating}
            >
              🎬 Video
            </button>

          </div>

          {/* =================================================
              VIDEO SOURCE
          ================================================= */}

          {mode === "video" && (
            <div className="video-source">

              <div className="video-source-header">
                <div>
                  <label>
                    🎬 Image → Video
                  </label>

                  <p>
                    Animate a generated image
                    or create a video from text.
                  </p>
                </div>

                {videoSourceImage && (
                  <button
                    className="small-button"
                    onClick={() =>
                      setVideoSourceImage("")
                    }
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {videoSourceImage ? (
                <div className="source-preview">

                  <img
                    src={
                      videoSourceImage
                    }
                    alt="Selected video source"
                  />

                  <div>
                    <strong>
                      Image selected
                    </strong>

                    <p>
                      Your next video will
                      animate this image.
                    </p>
                  </div>

                </div>
              ) : generatedImage ? (
                <div className="source-preview">

                  <img
                    src={generatedImage}
                    alt="Generated source"
                  />

                  <button
                    className="small-button"
                    onClick={() =>
                      setVideoSourceImage(
                        generatedImage
                      )
                    }
                  >
                    🎬 Use This Image
                  </button>

                </div>
              ) : (
                <div className="video-text-mode">
                  <span>
                    💡
                  </span>

                  <p>
                    No image selected.
                    WonderAI will create a
                    text-to-video generation.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* =================================================
              PROMPT
          ================================================= */}

          <div className="prompt-area">

            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(
                  event.target.value
                );

                setEnhancedPrompt("");

                clearMessages();
              }}
              placeholder={
                mode === "image"
                  ? "Describe the image you want to create..."
                  : videoSourceImage
                  ? "Describe how the image should move..."
                  : "Describe the video scene and motion you want..."
              }
              maxLength={2000}
              disabled={isGenerating}
            />

            <div className="prompt-bottom">

              <button
                className="enhance-button"
                onClick={
                  enhancePrompt
                }
                disabled={
                  isEnhancing ||
                  isGenerating ||
                  !prompt.trim()
                }
              >
                {isEnhancing
                  ? "✨ Enhancing..."
                  : "✨ Enhance Prompt"}
              </button>

              <span className="character-count">
                {promptCount}/2000
              </span>

            </div>

          </div>

          {/* =================================================
              ENHANCED PROMPT
          ================================================= */}

          {enhancedPrompt && (
            <div className="enhanced-result">

              <div className="enhanced-title">
                ✨ Enhanced Prompt
              </div>

              <p>
                {enhancedPrompt}
              </p>

            </div>
          )}

          {/* =================================================
              OPTIONS
          ================================================= */}

          <div className="options">

            <div className="option">

              <label>
                Style
              </label>

              <select
                value={style}
                onChange={(event) =>
                  setStyle(
                    event.target.value
                  )
                }
                disabled={isGenerating}
              >
                <option>
                  3D Cartoon
                </option>

                <option>
                  Realistic
                </option>

                <option>
                  Anime
                </option>

                <option>
                  Watercolor
                </option>

                <option>
                  Cinematic
                </option>

                <option>
                  Fantasy
                </option>
              </select>

            </div>

            <div className="option">

              <label>
                Aspect Ratio
              </label>

              <select
                value={aspectRatio}
                onChange={(event) =>
                  setAspectRatio(
                    event.target.value
                  )
                }
                disabled={isGenerating}
              >
                <option>
                  16:9 Landscape
                </option>

                <option>
                  1:1 Square
                </option>

                <option>
                  9:16 Portrait
                </option>

                <option>
                  4:3 Classic
                </option>
              </select>

            </div>

            <div className="option">

              <label>
                Quality
              </label>

              <select
                value={quality}
                onChange={(event) =>
                  setQuality(
                    event.target.value
                  )
                }
                disabled={isGenerating}
              >
                <option>
                  HD
                </option>

                <option>
                  Full HD
                </option>

                <option>
                  2K
                </option>

                <option>
                  4K
                </option>
              </select>

            </div>

          </div>

          {/* =================================================
              GENERATE BUTTON
          ================================================= */}

          <button
            className="generate-button"
            onClick={generate}
            disabled={
              isGenerating ||
              isEnhancing ||
              !prompt.trim()
            }
          >

            {isGenerating ? (
              <>
                <span className="button-spinner">
                  ◌
                </span>

                Creating...
              </>
            ) : (
              <>
                <span>
                  ✦
                </span>

                {mode === "image"
                  ? "Generate Image"
                  : videoSourceImage
                  ? "Animate Image"
                  : "Generate Video"}
              </>
            )}

          </button>

          {/* =================================================
              ERROR
          ================================================= */}

          {generationError && (
            <div className="generation-error">

              <div className="error-title">
                ⚠️ Something went wrong
              </div>

              <p>
                {generationError}
              </p>

              {generationError
                .toLowerCase()
                .includes("balance") ||
                generationError
                  .toLowerCase()
                  .includes("credit") ||
                generationError
                  .toLowerCase()
                  .includes("billing") ? (
                <small>
                  Your WonderAI code is reaching
                  FAL correctly, but generation
                  requires available FAL credits.
                </small>
              ) : null}

            </div>
          )}

        </section>

        {/* =================================================
            LOADING
        ================================================= */}

        {isGenerating && (
          <section className="generation-loading">

            <div className="loading-icon">
              ✦
            </div>

            <h2>
              Creating your masterpiece...
            </h2>

            <p>
              WonderAI is processing your
              request. Please don't close
              the page.
            </p>

            <div className="loading-bar">
              <div className="loading-progress" />
            </div>

          </section>
        )}

        {/* =================================================
            IMAGE RESULT
        ================================================= */}

        {generatedImage &&
          !isGenerating && (
            <section className="result-section">

              <p className="eyebrow">
                YOUR CREATION
              </p>

              <h2>
                ✨ Your image is ready
              </h2>

              <div className="result-image-wrapper">

                <img
                  src={generatedImage}
                  alt="WonderAI generated"
                  className="generated-image"
                />

              </div>

              <div className="result-actions">

                <button
                  className="save-button"
                  onClick={
                    saveCreation
                  }
                >
                  ❤️ Save
                </button>

                <button
                  className="download-button"
                  onClick={() =>
                    downloadFile(
                      generatedImage,
                      "wonderai-image.jpg"
                    )
                  }
                >
                  💾 Download
                </button>

                <button
                  className="download-button"
                  onClick={() =>
                    animateImage(
                      generatedImage
                    )
                  }
                >
                  🎬 Animate Image
                </button>

              </div>

            </section>
          )}

        {/* =================================================
            VIDEO RESULT
        ================================================= */}

        {generatedVideo &&
          !isGenerating && (
            <section className="result-section">

              <p className="eyebrow">
                YOUR VIDEO
              </p>

              <h2>
                🎬 Your video is ready
              </h2>

              <div className="result-video-wrapper">

                <video
                  src={generatedVideo}
                  controls
                  playsInline
                  preload="metadata"
                  className="generated-video"
                />

              </div>

              <div className="result-actions">

                <button
                  className="save-button"
                  onClick={
                    saveCreation
                  }
                >
                  ❤️ Save
                </button>

                <button
                  className="download-button"
                  onClick={() =>
                    downloadFile(
                      generatedVideo,
                      "wonderai-video.mp4"
                    )
                  }
                >
                  💾 Download Video
                </button>

              </div>

            </section>
          )}

        {/* =================================================
            QUICK TOOLS
        ================================================= */}

        <section className="quick-tools">

          <h2>
            Quick tools
          </h2>

          <div className="tool-grid">

            <div
              className="tool-card clickable-tool"
              onClick={() => {
                scrollTo("studio");

                setTimeout(() => {
                  document
                    .querySelector(
                      ".prompt-area textarea"
                    )
                    ?.focus();
                }, 500);
              }}
            >

              <div className="tool-icon">
                ✨
              </div>

              <div>
                <h3>
                  Prompt Enhancer
                </h3>

                <p>
                  Turn simple ideas into
                  powerful prompts.
                </p>
              </div>

            </div>

            <div
              className="tool-card clickable-tool"
              onClick={() =>
                scrollTo(
                  "character-creator"
                )
              }
            >

              <div className="tool-icon">
                👤
              </div>

              <div>
                <h3>
                  Character Creator
                </h3>

                <p>
                  Build reusable characters
                  for your stories.
                </p>
              </div>

            </div>

            <div
              className="tool-card clickable-tool"
              onClick={() =>
                scrollTo("studio")
              }
            >

              <div className="tool-icon">
                🎬
              </div>

              <div>
                <h3>
                  Image to Video
                </h3>

                <p>
                  Bring your generated
                  images to life.
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            CHARACTER CREATOR
        ================================================= */}

        <section
          className="character-section"
          id="character-creator"
        >

          <p className="eyebrow">
            CHARACTER LAB
          </p>

          <h2>
            👤 Character Creator
          </h2>

          <p className="subtitle">
            Create a consistent character
            you can reuse in future stories.
          </p>

          <div className="character-form">

            <div className="character-field">

              <label>
                Character name
              </label>

              <input
                value={character.name}
                onChange={(e) =>
                  updateCharacter(
                    "name",
                    e.target.value
                  )
                }
                placeholder="Example: Mia"
                maxLength={60}
              />

            </div>

            <div className="character-field">

              <label>
                Age
              </label>

              <input
                type="number"
                value={character.age}
                onChange={(e) =>
                  updateCharacter(
                    "age",
                    e.target.value
                  )
                }
                placeholder="8"
                min="1"
                max="100"
              />

            </div>

            <div className="character-field">

              <label>
                Gender
              </label>

              <select
                value={character.gender}
                onChange={(e) =>
                  updateCharacter(
                    "gender",
                    e.target.value
                  )
                }
              >

                <option>
                  Girl
                </option>

                <option>
                  Boy
                </option>

                <option>
                  Woman
                </option>

                <option>
                  Man
                </option>

              </select>

            </div>

            <div className="character-field">

              <label>
                Hair
              </label>

              <input
                value={character.hair}
                onChange={(e) =>
                  updateCharacter(
                    "hair",
                    e.target.value
                  )
                }
                placeholder="Long curly brown hair"
                maxLength={200}
              />

            </div>

            <div className="character-field">

              <label>
                Outfit
              </label>

              <input
                value={character.outfit}
                onChange={(e) =>
                  updateCharacter(
                    "outfit",
                    e.target.value
                  )
                }
                placeholder="Yellow dress and white shoes"
                maxLength={200}
              />

            </div>

            <div className="character-field">

              <label>
                Personality
              </label>

              <input
                value={
                  character.personality
                }
                onChange={(e) =>
                  updateCharacter(
                    "personality",
                    e.target.value
                  )
                }
                placeholder="Curious, cheerful and kind"
                maxLength={250}
              />

            </div>

            <div className="character-field character-field-full">

              <label>
                Character description
              </label>

              <textarea
                value={
                  character.description
                }
                onChange={(e) =>
                  updateCharacter(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Anything special about this character..."
                maxLength={500}
              />

              <small>
                {
                  character.description
                    .length
                }
                /500
              </small>

            </div>

            <div className="character-buttons">

              <button
                className="generate-button"
                onClick={
                  createCharacterPrompt
                }
                disabled={isGenerating}
              >
                ✨ Generate Character Prompt
              </button>

              <button
                className="secondary-button"
                onClick={
                  generateCharacterImage
                }
                disabled={
                  isGenerating
                }
              >
                🖼️ Generate Character Image
              </button>

              <button
                className="secondary-button"
                onClick={
                  saveCharacter
                }
                disabled={isGenerating}
              >
                ❤️ Save Character
              </button>

            </div>

          </div>

          {characterPrompt && (
            <div className="enhanced-result">

              <div className="enhanced-title">
                ✨ Character Prompt Ready
              </div>

              <p>
                {characterPrompt}
              </p>

            </div>
          )}

        </section>

        {/* =================================================
            CHARACTER LIBRARY
        ================================================= */}

        <section
          className="library-section"
          id="character-library"
        >

          <p className="eyebrow">
            YOUR CHARACTERS
          </p>

          <h2>
            📚 Character Library
          </h2>

          <p className="subtitle">
            Reuse your saved characters
            whenever you create a new story.
          </p>

          {characters.length === 0 ? (
            <div className="empty-creations">

              <div className="empty-icon">
                👤
              </div>

              <h3>
                No saved characters
              </h3>

              <p>
                Generate and save your first
                character above.
              </p>

            </div>
          ) : (
            <div className="character-library-grid">

              {characters.map(
                (savedCharacter) => (
                  <article
                    className="saved-character-card"
                    key={
                      savedCharacter.id
                    }
                  >

                    {savedCharacter.image ? (
                      <img
                        src={
                          savedCharacter.image
                        }
                        alt={
                          savedCharacter.name
                        }
                      />
                    ) : (
                      <div className="character-placeholder">
                        👤
                      </div>
                    )}

                    <div className="saved-character-info">

                      <h3>
                        {
                          savedCharacter.name
                        }
                      </h3>

                      <p>
                        {
                          savedCharacter.age
                        } years ·{" "}
                        {
                          savedCharacter.gender
                        }
                      </p>

                      <button
                        className="small-button"
                        onClick={() =>
                          reuseCharacter(
                            savedCharacter
                          )
                        }
                      >
                        ♻️ Reuse Character
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deleteCharacter(
                            savedCharacter.id
                          )
                        }
                      >
                        🗑️ Delete
                      </button>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

        {/* =================================================
            MY CREATIONS
        ================================================= */}

        <section
          className="my-creations"
          id="my-creations"
        >

          <div className="creations-header">

            <div>

              <p className="eyebrow">
                YOUR LIBRARY
              </p>

              <h2>
                My Creations
              </h2>

            </div>

            {creations.length > 0 && (
              <button
                className="clear-button"
                onClick={
                  clearCreations
                }
              >
                Clear All
              </button>
            )}

          </div>

          {creations.length === 0 ? (
            <div className="empty-creations">

              <div className="empty-icon">
                ✦
              </div>

              <h3>
                No creations yet
              </h3>

              <p>
                Your saved images and videos
                will appear here.
              </p>

            </div>
          ) : (
            <div className="creations-grid">

              {creations.map(
                (creation) => (
                  <article
                    className="creation-card"
                    key={creation.id}
                  >

                    {creation.type ===
                    "video" ? (
                      <video
                        src={
                          creation.video
                        }
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={
                          creation.image
                        }
                        alt={
                          creation.prompt
                        }
                      />
                    )}

                    <div className="creation-info">

                      <p>
                        {creation.prompt}
                      </p>

                      <small>
                        {creation.type} ·{" "}
                        {
                          creation.aspectRatio
                        }
                      </small>

                      <div className="creation-actions">

                        <button
                          onClick={() =>
                            downloadFile(
                              creation.type ===
                                "video"
                                ? creation.video
                                : creation.image,
                              creation.type ===
                                "video"
                                ? "wonderai-video.mp4"
                                : "wonderai-image.jpg"
                            )
                          }
                        >
                          💾 Download
                        </button>

                        <button
                          onClick={() =>
                            deleteCreation(
                              creation.id
                            )
                          }
                        >
                          🗑️ Delete
                        </button>

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </main>

      {/* =====================================================
          MOBILE BOTTOM NAV
      ===================================================== */}

      <nav className="mobile-nav">

        <button
          onClick={() =>
            scrollTo("studio")
          }
        >
          ✦
          <span>
            Create
          </span>
        </button>

        <button
          onClick={() =>
            scrollTo(
              "character-creator"
            )
          }
        >
          👤
          <span>
            Character
          </span>
        </button>

        <button
          onClick={() =>
            scrollTo("character-library")
          }
        >
          📚
          <span>
            Library
          </span>
        </button>

        <button
          onClick={() =>
            scrollTo("my-creations")
          }
        >
          ❤️
          <span>
            Creations
          </span>
        </button>

      </nav>

    </div>
  );
}

export default App;