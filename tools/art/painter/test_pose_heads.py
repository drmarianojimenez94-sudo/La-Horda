#!/usr/bin/env python3
"""Non-upright head assembly: isolation, clipping and malformed recipe checks."""
import unittest
import numpy as np
from painter import CELL, pose_head, assemble

class PoseHeadTest(unittest.TestCase):
    def setUp(self):
        self.body = np.zeros((CELL, CELL, 4), np.uint8)
        self.body[20:40, 20:40] = [70, 30, 10, 255]
        self.donor = np.zeros_like(self.body)
        self.donor[5:10, 5:10] = [20, 40, 80, 255]
        self.spec = dict(sourcePolygon=[[4,4],[10,4],[10,10],[4,10]],
                         erasePolygon=[[20,20],[39,20],[39,39],[20,39]], offset=[20,20])

    def test_replaces_shape_not_just_color(self):
        result, mask = pose_head(self.body, self.donor, self.spec)
        self.assertEqual(int(mask.sum()), 25)
        np.testing.assert_array_equal(result[25:30,25:30], self.donor[5:10,5:10])
        self.assertEqual(int((result[:,:,3] > 0).sum()), 25)
        self.assertTrue(np.all(result[mask,3] == 255))

    def test_unselected_body_and_inputs_preserved(self):
        self.body[80:85,80:85] = [10,50,20,255]
        body, donor = self.body.copy(), self.donor.copy()
        result, _ = pose_head(self.body, self.donor, self.spec)
        np.testing.assert_array_equal(result[80:85,80:85], body[80:85,80:85])
        np.testing.assert_array_equal(self.body, body)
        np.testing.assert_array_equal(self.donor, donor)

    def test_rejects_clipping_instead_of_truncating(self):
        for offset in [[-6,0],[108,0],[0,-6],[0,108]]:
            with self.subTest(offset=offset), self.assertRaisesRegex(ValueError,'clip'):
                pose_head(self.body, self.donor, {**self.spec,'offset':offset})

    def test_rejects_silent_unused_frame_keys(self):
        for overrides in [{'36': {}}, {'-1': {}}, {'032': {}}, {'oops': {}}, {'32': None}, []]:
            with self.subTest(overrides=overrides), self.assertRaisesRegex(ValueError,'frame keys'):
                assemble({'body':'not_read','poseHeadOverrides':overrides})

    def test_rejects_empty_source(self):
        with self.assertRaisesRegex(ValueError,'no donor pixels'):
            pose_head(self.body, np.zeros_like(self.donor), self.spec)

    def test_rejects_bad_polygons_and_offsets(self):
        for patch in [dict(sourcePolygon=[]),dict(erasePolygon=[[0,0],[112,0],[0,8]]),
                      dict(sourcePolygon=[[0,0],[2.5,0],[0,8]]),dict(offset=[1.1,0]),
                      dict(offset=[0]),dict(offset=None)]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                pose_head(self.body,self.donor,{**self.spec,**patch})

if __name__ == '__main__':
    unittest.main()
