package il.ac.bgu.cs.bp.chess.eventSets;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSet;

import java.util.Arrays;
import java.util.Collection;
import java.util.Map;
import java.util.NoSuchElementException;

public class StrengthenPawns implements EventSet {
    /*
    const ESCenterCaptureMoves = bp.EventSet("EScenterCaptureMoves", function (e) {
    return e.name == 'Move' && ( e.data.dst[1] == '3' || e.data.dst[1] == '4' )
      && ( e.data.src[0] == 'c'  || e.data.src[0] == 'd' || e.data.src[0] == 'e'  || e.data.src[0] == 'f' ||
      e.data.src[0] == 'b'  || e.data.src[0] == 'g' )
      && ( e.data.dst[0] == 'c'  || e.data.dst[0] == 'd' || e.data.dst[0] == 'e'  || e.data.dst[0] == 'f') })
     */


    @Override
    public boolean contains(BEvent bEvent) {
        char[] centerColumns = {'c','d','e','f'};
        if (bEvent.name.equals("Move") && bEvent.maybeData != null) {
            try {
                Map<String, Object> eData = (Map<String, Object>) bEvent.getDataField().get();
                var destinationCell = eData.get("dst");
                char dstCol = destinationCell.toString().charAt(0);
                return dstCol == 'c' || dstCol == 'd' || dstCol == 'e' || dstCol == 'f' ;
            } catch (NoSuchElementException e) {
                return false;
            }
        }
        return false;
    }
}
