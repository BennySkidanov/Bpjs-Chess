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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

public class Main {
    private static String pgn = "";

    public static void main(final String[] args) throws InterruptedException {



//        System.out.println(MessageFormat.format("'{'\"hhh\":{0}'}'",3));
        /** Choose the desired COBP program... */

//    BProgram bprog = new ContextBProgram("chess/dal.js", "chess/bl.js");
  //      List<String> game;
//        String id ="6363026990";
//        String pgn = "1. e4 1... e5 2. Nf3 2... f5 3. exf5 3... Nf6 4. Nxe5 4... d6 5. Nf3 5... Bxf5 6. Bd3 6... Bxd3 7. cxd3 7... Qe7+ 8. Qe2 8... Qxe2+ 9. Kxe2 9... Nc6 10. Kd1 10... Be7 11. Re1 11... O-O 12. Ng5 12... Rfe8 13. Ne6 13... Rac8 14. d4 14... Ng4 15. d3 15... Nxf2+ 16. Kc2 16... Nb4+ 17. Kc3 17... Nbxd3 18. Rf1 18... Nxc1 19. Rxc1 19... Ng4 20. Na3 20... Nxh2 21. Nb5 21... Bd8 22. Nxd8 22... Rexd8 23. Nxa7 23... Ra8 24. Nb5 24... c6 25. Nc7 25... Rac8 26. Ne6 26... Re8 27. Nf4 27... Ng4 28. Rf1 28... Ne3 29. Rf3 29... Nf5 30. g4 30... Nh4 31. Rh3 31... Ng6 32. Nh5 32... c5 33. Kd3 33... cxd4 34. Kxd4 34... b5 35. Rf1 35... Rc4+ 36. Kd5 36... Rxg4 37. Kxd6 37... Rd4+ 38. Kc6 38... Rb8 39. Rb3 39... b4 40. Kc5 40... Rh4 41. Ng3 41... Ne5 42. Re1 42... Rc8+ 43. Kd5 43... Nf3 44. Re7 44... Rd4+ 45. Ke6 45... Rc6+ 46. Kf5 46... Rf6#";

           // string pgn = "1. e4 b6 2. Bc4 Bb7 3. d3 Nh6 4. Bxh6 gxh6 5. Qf3 e6 6. Nh3 Bg7"

        List<String[]> games = new ArrayList<>();
        int id = 1;

        // Read each line of the PGNData file and insert it into the games list
        BufferedReader reader;
        try {
            reader = new BufferedReader(new FileReader("PGNData.txt"));
            String line = reader.readLine();
            while (line != null) {
                String idString = String.valueOf(id);
                String [] arr = {idString, line};
                games.add(arr);
                id++;
                // read next line
                line = reader.readLine();
            }
            reader.close();
        } catch (IOException e) {
            e.printStackTrace();
        }

        ExecutorService executor = Executors.newCachedThreadPool();

        for (String[] g : games) {
            executor.submit(() -> runGame(g));
        }

        executor.shutdown();
    }

     private static void runGame(String[] game) {
            var bprog = new ContextBProgram("dal.js", "bl.js");
            var ess = new ChessEventSelectionStrategy(game[0]);

            bprog.setEventSelectionStrategy(ess);
            bprog.putInGlobalScope("generationMode", false);
            bprog.putInGlobalScope("game_id", game[0]);
            bprog.putInGlobalScope("pgn", game[1]);
            bprog.setWaitForExternalEvents(false);

            final BProgramRunner rnr = new BProgramRunner(bprog);

            rnr.addListener(new PrintBProgramRunnerListener());
            rnr.run();

            try (FileWriter JSONWriter = new FileWriter("GameSequences/Game" + game[0] + ".json")) {
                JSONWriter.write(ess.getGameData().stream().collect(Collectors.joining(",", "[", "]")));
            } catch (IOException e) {
                e.printStackTrace();
            }
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
