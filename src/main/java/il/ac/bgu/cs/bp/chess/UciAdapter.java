package il.ac.bgu.cs.bp.chess;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;

import java.util.Scanner;

public class UciAdapter implements Runnable {
    private final BProgram bprog;

    public UciAdapter(BProgram bprog) {
        this.bprog = bprog;
    }

    private void playing()
    {
        Scanner scanner = new Scanner(System.in);
        String line;
        String normalStart = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

        while (scanner.hasNext())
        {
            line = scanner.nextLine();
//            System.out.println("line is "+line);
            if(line.equals("quit")) break;
//            else if(line.equals("print")) print();
            else if(line.startsWith("position")) move(line);
            else if(line.equals("start")) bprog.enqueueExternalEvent(new BEvent("ParseFen",normalStart));
        }
    }

    private void move(String line) {
        String piece, oldCell, newCell;
        // init fields from fen
//        BEvent e = new BEvent("Move", {cell: newCell});
//        bprog.enqueueExternalEvent(e);
    }

    @Override
    public void run() {
        while (true) {

        }
    }
}
