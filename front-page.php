<?php 
get_header(); ?>
<div id="primary" class="full-content-area">
	<div class="wrapper fullwidth-grid">
		<?php get_template_part('inc/project-categories'); ?>
	</div>
	<?php while ( have_posts() ) : the_post(); 
		$mission_image = get_field('mission_image');
		$mission_text = get_field('mission_text'); 
		$row1CLass = ($mission_image && $mission_text) ? 'half':'full';
		$placeholder = get_bloginfo("template_url") . "/images/rectangle.png";
		?>

		<?php if ( $mission_image || $mission_text ) { ?>
		<section class="home-column-text clear <?php echo $row1CLass ?>">
			<div class="full-wrapper">
				<div class="flexrowz clear">
					<?php if ($mission_image) { ?>
					<div class="column right js-blocks">
						<div class="inside clear" style="background-image:url('<?php //cho $mission_image['url'] ?>')">
							<!-- <img src="<?php echo $placeholder ?>" alt="" aria-hidden="true"> -->
							<a href="https://www.jenkinspeer.com/firm/mission-values/">
								<img src="<?php echo $mission_image['url'] ?>">
							</a>
						</div>
					</div>
					<?php } ?>
					
					<?php if ($mission_text) { ?>
					<div class="column left js-blocks">
						<div class="inside clear nolinkstyle">
							<a href="https://www.jenkinspeer.com/firm/mission-values/">
								<?php echo $mission_text; ?>
							</a>
						</div>
					</div>
					<?php } ?>
				</div>
			</div>	
		</section>	
		<?php } ?>
		
		<div class="home-news cf <?php echo $has_instagram ?>">
			<?php get_template_part('inc/latest-news'); ?>
		</div>

		<?php 
		$has_instagram = 'no-instagram';
		if ( $instagramFeeds = do_shortcode('[instagram-feed]') ) { 
			$has_error = (strpos($instagramFeeds, 'No connected account') !== false) ? true : false; ?>
			<?php if ($has_error==false) { $has_instagram='has-instagram'; ?>
			<div id="instagram_feeds" class="instagram_feeds clear"><?php echo do_shortcode('[instagram-feed]'); ?></div>
			<?php } ?>
		<?php } ?>
		
	<?php endwhile; ?>
</div><!-- #primary -->
<?php get_footer(); ?>