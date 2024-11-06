import { Box } from "@mui/material";
import CodeEditor from "./components/CodeEditor";

function App() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#0f0a19",
        color: "grey.500",
        px: 6,
        py: 8,
      }}
    >
      <CodeEditor />
    </Box>
  );
}

export default App;