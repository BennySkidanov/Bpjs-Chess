package il.ac.bgu.cs.bp.chess;
import il.ac.bgu.cs.bp.bpjs.context.ContextBProgram;
import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.PrintBProgramRunnerListener;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class Main {
    private static String pgn = "";

    public static void main(final String[] args) throws InterruptedException {
        List<String[]> games = new ArrayList<>();
        int id = 1;
        // Read each line of the PGNData file and insert it into the games list
        BufferedReader reader;
        try {
            String currentPath = System.getProperty("user.dir");
            System.out.println("Current working directory: " + currentPath);
            reader = new BufferedReader(new FileReader("1500/PGNData.txt"));
            //reader = new BufferedReader(new FileReader("PGNData.txt"));
            String line = reader.readLine();
            while (line != null) {
                if (id >= 45140) {
                    String idString = String.valueOf(id);
                    games.add(new String[]{idString, line});
                }
                id++;
                // read next line
                line = reader.readLine();
            }
            reader.close();
        } catch (IOException e) {
            e.printStackTrace();
        }


        ExecutorService executor = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());

        for (String[] g : games) {
            executor.submit(() -> {
                try {
                    var bprog = new ContextBProgram("dal.js", "bl.js");
                    var ess = new ChessEventSelectionStrategy(g[0]);

                    bprog.setEventSelectionStrategy(ess);
                    bprog.putInGlobalScope("generationMode", false);
                    bprog.putInGlobalScope("game_id", g[0]);
                    bprog.putInGlobalScope("pgn", g[1]);
                    bprog.setWaitForExternalEvents(false);

                    final BProgramRunner rnr = new BProgramRunner(bprog);
                    rnr.addListener(new PrintBProgramRunnerListener());
                    rnr.run();

                    try (FileWriter JSONWriter = new FileWriter("GameSequences1500/WithSelectablesAfterFix/Game" + g[0] + ".json")) {
                        JSONWriter.write(ess.getGameData().stream().collect(Collectors.joining(",", "[", "]")));
                    }
                } catch (Exception e) {
                    System.err.println("Error processing game " + g[0]);
                    e.printStackTrace();
                }
            });
        }

        executor.shutdown();
        executor.awaitTermination(Long.MAX_VALUE, TimeUnit.NANOSECONDS);

    }


//    private static BEvent move(String src, String dst) {
//        return new BEvent("Move", Map.of("dst", dst, "src", src));
//    }
//
//    private static void simulateGameFromPgn(BProgram bprog, String pgn) {
//        // Arrays.stream(pgn.split(" ")).map(m -> move(m.substring(0,2),m.substring(2))).forEach(bprog::enqueueExternalEvent);
//        //    // movesList = translateFromPGN(pgn)
//    }
}