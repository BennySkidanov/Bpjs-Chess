package il.ac.bgu.cs.bp.chess;

import il.ac.bgu.cs.bp.bpjs.context.ContextBProgram;
import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.PrintBProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;

import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class Main {
    private static String pgn = "";

    public static void main(final String[] args) throws InterruptedException {
//        System.out.println(MessageFormat.format("'{'\"hhh\":{0}'}'",3));
        /** Choose the desired COBP program... */
        var bprog = new ContextBProgram("dal.js", "bl.js");
//    BProgram bprog = new ContextBProgram("chess/dal.js", "chess/bl.js");
        List<String> game;
        String id ="6363026990";
        String pgn = "1. e4 1... e5 2. Nf3 2... Nf6 3. d3 3... Nc6 4. Bg5 4... Be7 5. Bxf6 5... Bxf6 6. Nc3 6... O-O 7. Nd5 7... d6 8. Nxf6+ 8... Qxf6 9. Be2 9... Bg4 10. Nd2 10... Bxe2 11. Qxe2 11... Nd4 12. Qd1 12... a5 13. O-O 13... Rad8 14. c3 14... Ne6 15. Qg4 15... Nf4 16. Qf3 16... g5 17. Nc4 17... b6 18. Ne3 18... Kg7 19. Ng4 19... Qg6 20. g3 20... Ne6 21. Kg2 21... h5 22. Ne3 22... g4 23. Qe2 23... h4 24. Nf5+ 24... Kh7 25. Nxh4 25... Qg5 26. Qe3 26... Rg8 27. Qxg5 27... Rxg5 28. Nf5 28... Kg6 29. f3 29... Rh8 30. Nh4+ 30... Kg7 31. Nf5+ 31... Kf8 32. fxg4 32... Rxg4 33. h3 33... Nf4+ 34. Kf3 34... Rg5 35. gxf4 35... Rxh3+ 36. Ke2 36... exf4 37. Rxf4 37... f6 38. Raf1 38... Kf7 39. Nd4 39... Rg6 40. Nb5 40... Ke6 41. Nxc7+ 41... Ke5 42. Rf5#";

        List<String[]> games = new ArrayList<>();
        String [] arr = {id, pgn};
        games.add(arr);

        games.forEach(g->{
            var ess = new ChessEventSelectionStrategy(g[0]);
            bprog.setEventSelectionStrategy(ess);
            bprog.putInGlobalScope("generationMode",false);
            bprog.putInGlobalScope("game_id",g[0]);
            bprog.putInGlobalScope("pgn",g[1]);

            bprog.setWaitForExternalEvents(false);
            final BProgramRunner rnr = new BProgramRunner(bprog);

/*//    rnr.addListener(new PrintCOBProgramRunnerListener(Level.CtxChanged));
    rnr.addListener(new Explanations());
    bprog.setLogLevel(BpLog.LogLevel.Warn);
    Thread t = new Thread(rnr);
    t.start();
    //simulateGameFromPgn(bprog, pgn);
    //simulateGame(bprog);
    rnr.run();
    t.join();*/

            rnr.addListener(new PrintBProgramRunnerListener());
            rnr.run();
            try (FileWriter JSONWriter = new FileWriter("GameSequence.json")) {
                JSONWriter.write(ess.getGameData().stream().collect(Collectors.joining(",","[","]")));
            } catch (IOException e) {
                e.printStackTrace();
            }
        });

    }

    private static void simulateGame(BProgram bprog) {
        List<BEvent> moves = List.of(
//            move("a2","a4"),
////            move("b7","b6")
////            move("a4", "a5"),
////            move("e7", "e5"),
////            move("e2", "e4"),
////            move("d7", "d5"),
////            move("e4", "d5"),
////            move("c7", "c5"),
////            move("d5", "d6")
        );
        moves.forEach(bprog::enqueueExternalEvent);
    }

    private static BEvent move(String src, String dst) {
        return new BEvent("Move", Map.of("dst", dst, "src", src));
    }

    private static void simulateGameFromPgn(BProgram bprog, String pgn) {
        // Arrays.stream(pgn.split(" ")).map(m -> move(m.substring(0,2),m.substring(2))).forEach(bprog::enqueueExternalEvent);
        //    // movesList = translateFromPGN(pgn)
    }
}
