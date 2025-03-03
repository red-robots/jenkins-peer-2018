<?php get_header(); ?>
<div id="primary" class="full-content area clear">

  <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>

    <?php $galleries = get_field('project_gallery'); ?>
    <?php if ($galleries) { 
            // echo '<pre>';
            // print_r($galleries);
            // echo '</pre>';
      ?>
      <div class="swiper-container clear">
        <div class="swipe-projects swiper-wrapper">
            <?php $j=1; while(the_repeater_field('project_gallery')): ?>
              <?php $image = wp_get_attachment_image_src(get_sub_field('project_images'), 'full'); 
                    $embed = get_sub_field('video_embed');
              ?>
              
                <div class="slick-slide swipeImg<?php echo ($j==1) ? ' slick-current slick-active slick-center':''?>">
                  <?php if($embed) { ?>
                    <!-- <div class="video-container"></div> -->
                      <?php echo $embed; ?>
                  <?php } elseif ($image) { ?>
                    <div class="imagediv" style="background-image:url('<?php echo $image[0]; ?>')"></div>
                    <img src="<?php echo $image[0]; ?>" alt="<?php  the_sub_field('title');?>" />
                  <?php } ?>
                </div>
              
            <?php $j++; endwhile; ?>
        </div>
      </div>
    <?php } ?>

    <div class="content-wrapper wrapper clear">
      <header class="project-header-title">
        <?php if ( current_user_can('administrator') ) { ?>
            <div class="editpostlinkdiv"><a class="editpostlink" href="<?php echo get_edit_post_link( get_the_ID() ); ?>">Edit</a></div>
        <?php } ?>
        <h1 class="main-proj-title"><?php the_field('first_title'); ?></h1>
        <?php if(get_field('second_title')!="") { ?>
        <div class="sec-proj-title"><?php the_field('second_title'); ?></div>
        <?php } ?>
        <?php if(get_field('third_title')!="") { ?>
        <div class="third-proj-title"><?php the_field('third_title'); ?></div>
        <?php } ?>
      </header>

      <div class="project-info-wrapper">
        <?php if ( get_the_content() ) { ?>
          <div class="proj-main-content entry-content">
            <?php the_content(); ?>
          </div>
        <?php } ?>
       
        <?php if(get_field('features')!="") { ?>
          <div class="proj-features-content entry-content">
            <?php the_field('features'); ?>
          </div>
        <?php } ?>
      </div>

      <?php get_template_part('inc/related-projects'); ?>
    </div>

  <?php endwhile;  endif; ?>

</div>


<?php get_footer(); ?>