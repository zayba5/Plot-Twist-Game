      const stories = data?.stories ?? [];

      // Use roundNumber to choose a story from the returned list.
      // Assumes roundNumber starts at 1.
      const story = stories[roundNumber - 1];

      if (!story) {
        return {
          prompt: "There is no story yet. Please think of an initial prompt to begin the story."
        };
      }

      const storyParts = story?.story_parts ?? [];

      if (storyParts.length === 0) {
        return {
          prompt: "There is no story yet. Please think of an initial prompt to begin the story."
        };
      }

      const lastStoryPart = storyParts[storyParts.length - 1];

      return {
        prompt: lastStoryPart?.part_content ?? "Please continue the story."
      };
    

    async function loadPrompt() {
      try {
        const data = await fetchPrompt(gameId, roundNumber);
        setPrompt(data?.prompt ?? `Write a short story based on this prompt, round ${roundNumber}`);
      } catch (error) {
        console.error("Failed to load prompt:", error);
        setPrompt("Failed to load prompt. Write a short story based on this round.");
      }
    }

    loadPrompt();


      //idk what this part does
      useEffect(() => {
        function resetRoundState(nextPrompt, nextRoundNumber, nextTimeLeft) {
          setRoundNumber(nextRoundNumber);
          setPrompt(nextPrompt);
          setStoryText("");
          setSubmitted(false);
          setSubmitting(false);
          setTimeLeft(nextTimeLeft);
        }
    
        function handleRoundStarted(payload) {
          console.log("round_started:", payload);
    
          resetRoundState(
            payload?.prompt ?? "",
            payload?.round_number ?? 1,
            payload?.round_time_seconds ?? ROUND_TIME_SECONDS
          );
        }
    
        function handleAllStoriesIn(payload) {
          console.log("all stories in:", payload);
        }
    
        function handleRoundEnded(payload) {
          console.log("round ended:", payload);
    
          const endedRoundNumber = payload?.round_number ?? 1;
          if (endedRoundNumber >= MAX_ROUNDS) {
            navigate("/vote");
            return;
          }
    
          resetRoundState(
            payload?.next_prompt ?? "",
            payload?.next_round_number ?? endedRoundNumber + 1,
            payload?.round_time_seconds ?? ROUND_TIME_SECONDS
          );
        }
    
        function handleGoToVoting(payload) {
          console.log("go_to_voting:", payload);
          navigate("/vote");
        }
    
        function handleStoriesRotated(payload) {
          console.log("stories rotated:", payload);
        }
    
        socket.on("round_started", handleRoundStarted);
        socket.on("all_stories_in", handleAllStoriesIn);
        socket.on("round_ended", handleRoundEnded);
        socket.on("go_to_voting", handleGoToVoting);
        socket.on("stories_rotated", handleStoriesRotated);
    
        return () => {
          socket.off("round_started", handleRoundStarted);
          socket.off("all_stories_in", handleAllStoriesIn);
          socket.off("round_ended", handleRoundEnded);
          socket.off("go_to_voting", handleGoToVoting);
          socket.off("stories_rotated", handleStoriesRotated);
        };
      }, [navigate]);