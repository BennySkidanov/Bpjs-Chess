package il.ac.bgu.cs.bp.chess;

import il.ac.bgu.cs.bp.bpjs.context.ContextBProgram;
import il.ac.bgu.cs.bp.bpjs.context.PrintCOBProgramRunnerListener;
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

import static il.ac.bgu.cs.bp.bpjs.context.PrintCOBProgramRunnerListener.Level;

public class Main {
    private static String pgn = "";

    public static void main(final String[] args) throws InterruptedException {
//        System.out.println(MessageFormat.format("'{'\"hhh\":{0}'}'",3));
        /** Choose the desired COBP program... */
        var bprog = new ContextBProgram("dal.js", "bl.js");
//    BProgram bprog = new ContextBProgram("chess/dal.js", "chess/bl.js");
        List<String> game;
        String id ="911433767";
        String pgn = "1. e4 1... e5 2. Nf3 2... Nc6 3. d4 3... exd4 4. Nxd4 4... Nxd4 5. Qxd4 5... d6 " +
                "6. Bc4 6... Be6 7. Nc3 7... Nf6 8. O-O 8... Be7 9. Nd5 9... O-O 10. Be3 10... c6 11. Nxe7+ " +
                "11... Qxe7 12. Bd3 12... Rfd8 13. Rad1 13... c5 14. Qc3 14... d5 15. exd5 15... Nxd5 16. Qxc5 " +
                "16... Qh4 17. Qd4 17... Qh5 18. c4 18... Nf6 19. Qc3 19... Rac8 20. b3 20... Ng4 21. h3 21... Nf6 " +
                "22. Qc2 22... Nd5 23. Bxh7+ 23... Kf8 24. Be4 24... Nxe3 25. Rxd8+ 25... Rxd8 26. fxe3 26... Qg5 " +"" +
                "27. Rf3 27... Qe5 28. Rf2 28... Bxh3 29. gxh3 29... Qg3+ 30. Bg2 30... Qxe3 31. Qe2 31... Qc5 " +
                "32. Qf3 32... Rd7 33. Qg4 33... Rd2 34. Qf3 34... Rxa2 35. Qxf7#";

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
            /** internal context events are: "CTX.Changed", "_____CTX_LOCK_____", "_____CTX_RELEASE_____"
             * You can filter these event from printing on console using the Level:
             * Level.ALL : print all
             * Level.NONE : print none
             * Level.CtxChanged: print only CTX.Changed events (i.e., filter the transaction lock/release events)
             */
/*//    rnr.addListener(new PrintCOBProgramRunnerListener(Level.CtxChanged));
    rnr.addListener(new Explanations());
    bprog.setLogLevel(BpLog.LogLevel.Warn);
    Thread t = new Thread(rnr);
    t.start();
    //simulateGameFromPgn(bprog, pgn);
    //simulateGame(bprog);
    rnr.run();
    t.join();*/

            rnr.addListener(new PrintCOBProgramRunnerListener(Level.CtxChanged, new PrintBProgramRunnerListener()));
            rnr.run();
            FileWriter JSONWriter = null;
            try {
                JSONWriter = new FileWriter("GameSequence.json");
                JSONWriter.write(ess.getGameData().stream().collect(Collectors.joining(",","[","]")));
                JSONWriter.close();
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
