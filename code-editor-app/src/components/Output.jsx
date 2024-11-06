import { useState } from "react";
import { Box, Button, Typography, Snackbar, Alert } from "@mui/material";
import { executeCode } from "../api";

const Output = ({ editorRef, language }) => {
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;
    try {
      setIsLoading(true);
      const { run: result } = await executeCode(language, sourceCode);
      setOutput(result.output.split("\n"));
      setIsError(!!result.stderr);
    } catch (error) {
      console.error(error);
      setToastMessage(error.message || "Unable to run code");
      setToastOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseToast = () => {
    setToastOpen(false);
  };

  return (
    <Box sx={{ width: "50%" }} color= "white">
      <Typography mb={2} variant="h6">
        Output
      </Typography>
      <Button
        variant="outlined"
        color="success"
        sx={{ mb: 2 }}
        disabled={isLoading}
        onClick={runCode}
      >
        {isLoading ? "Running..." : "Run Code"}
      </Button>
      <Box
        sx={{
          height: "75vh",
          padding: 2,
          color: isError ? "error.main" : "white",
          border: "1px solid",
          borderRadius: 1,
          borderColor: isError ? "error.main" : "grey.800",
          overflowY: "auto",
        }}
      >
        {output
          ? output.map((line, i) => <Typography key={i}>{line}</Typography>)
          : 'Click "Run Code" to see the output here'}
      </Box>

      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseToast} severity="error" sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Output;
