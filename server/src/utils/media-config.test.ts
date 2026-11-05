import {it,expect} from 'vitest';
import {mediaDeliveryConfig} from '../../../packages/contracts/media-config.js';
it('allows one explicit public media origin and no implicit hosts',()=>{expect(mediaDeliveryConfig()).toEqual({origin:'',patterns:[]});expect(mediaDeliveryConfig('https://synthetic-media.example.test').patterns).toEqual([{protocol:'https',hostname:'synthetic-media.example.test',port:'',pathname:'/**'}]);});
it.each(['http://synthetic-media.example.test','https://user:secret@synthetic-media.example.test','https://synthetic-media.example.test/private/path'])('rejects an unsafe delivery origin %s',value=>expect(()=>mediaDeliveryConfig(value)).toThrow());
