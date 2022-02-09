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
        // String pgn = "1. d4 1... d5 2. c4 2... Nf6 3. Nc3 3... e6 4. a3 4... c5 5. Nf3 5... a6 6. a4 6... b6 7. Be3 7... Bb7 8. dxc5 8... Bxc5 9. Bxc5 9... bxc5 10. e3 10... O-O 11. Be2 11... Qe7 12. Ne5 12... Nbd7 13. Nxd7 13... Nxd7 14. O-O 14... Nf6 15. Qd2 15... Rad8 16. Rfd1 16... Rd7 17. Bf3 17... Rfd8 18. cxd5 18... Bxd5 19. Nxd5 19... Nxd5 20. Rac1 20... Nb4 21. Qc3 21... Na2 22. Qxc5 22... Rxd1+ 23. Rxd1 23... Qxc5 24. Rxd8+ 24... Qf8 25. Rxf8+ 25... Kxf8 26. h4 26... Nb4 27. Kh2 27... f5 28. g4 28... Nd3 29. gxf5 29... exf5 30. Be2 30... Nxb2 31. a5 31... Na4 32. Bxa6 32... Nc5 33. Be2 33... Ke7 34. Kg3 34... Kd6 35. Kf4 35... g6 36. h5 36... Kc6 37. a6 37... Kb6 38. hxg6 38... hxg6 39. Kg5 39... Ne4+ 40. Kxg6 40... Nxf2 41. Kxf5 41... Ka7 42. e4 42... Nh1 43. Bc4 43... Ng3+ 44. Ke5 44... Nh5 45. Ke6 45... Ng7+ 46. Kf6 46... Ne8+ 47. Ke7 47... Nc7 48. e5 48... Kb8 49. Kd7 49... Na8 50. Kc6 50... Nc7 51. a7+ 51... Kc8 52. e6 52... Kd8 53. e7+ 53... Kc8 54. e8=Q+ 54... Nxe8 55. a8=Q#";
        String pgn = "1. e4 1... f5 2. exf5 2... g6 3. fxg6 3... h5 4. g7 4... a5 5. gxh8=Q 5... b5 6. Qhxh5#";


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
