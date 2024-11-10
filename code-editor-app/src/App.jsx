import { Box } from "@mui/material";
import CodeEditor from "./components/CodeEditor";
import EnterName from './components/EnterName'
import { useStore } from './store'

function App() {
  const username = useStore(({ username }) => username)
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
      {username ? <CodeEditor /> : <EnterName />}
    </Box>
  );
}

export default App;